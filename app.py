from flask import Flask, render_template, request, jsonify
from boardgamegeek import BGGClient
from boardgamegeek.objects.games import CollectionBoardGame


from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import os
import base64
import posixpath
import json
from cryptography.fernet import Fernet

app = Flask(__name__)

bgg = BGGClient()


@app.route('/')
def index():
    return render_template('index.html')


def _read_data_file(filepath):
    try:
        with open(filepath, "rb") as fb:
            data = fb.read()
            games = json.loads(data.decode())
    except Exception as e:
        return None

    return games


@app.route('/api/collection', methods=['GET'])
def get_collection():
    username = request.args.get('username')
    filepath = f"data/{username}.json"
    games = None
    if posixpath.isfile(filepath):
        games = _read_data_file(filepath)
    else:
        try:
            collection: list[CollectionBoardGame] = bgg.collection(
                username, own=True, exclude_subtype="boardgameexpansion"
            )
            games = {}
            for game in collection:
                if game.min_players < game.max_players:
                    players = f"{game.min_players}-{game.max_players}"
                else:
                    players = f"{game.max_players}"

                if game.min_playing_time < game.max_playing_time:
                    playing_time = f"{game.min_playing_time}-{game.max_playing_time}"
                else:
                    playing_time = f"{game.playing_time}"
                game_dict = {
                    'id': game.id,
                    'name': game.name,
                    'thumbnail': game.thumbnail,
                    'year_published': game.year,
                    'players': players,
                    "playing_time": playing_time,
                    'plays': game.numplays,
                    'rating': game.rating,
                    'comment': game.comment
                }
                games[game.id] = game_dict

            with open(filepath, "wb") as fb:
                data = json.dumps(games)
                fb.write(data.encode())
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify(games)


@app.route('/api/<username>/game_details/<game_id>', methods=['GET'])
def get_game_details(username, game_id):
    filepath = f"data/{username}.json"
    games = _read_data_file(filepath)
    try:
        game_details = games.get(game_id)
        return jsonify(game_details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/selected_games', methods=['POST'])
def selected_games():
    selected_games = request.json.get('selected_games', [])
    username: str = request.json.get('user_name')
    password: str = request.json.get('user_password')
    selected_games_data = json.dumps(selected_games)

    # Derive a key from the password
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    cipher_suite = Fernet(key)

    # Encrypt the data with the derived key
    encrypted_data = cipher_suite.encrypt(selected_games_data.encode())

    # Save the salt and encrypted data
    salt_filename = f"data/{username}-salt.key"
    with open(salt_filename, "wb") as salt_file:
        salt_file.write(salt)

    data_filename = f"data/{username}-selected.enc"
    with open(data_filename, "wb") as data_file:
        data_file.write(encrypted_data)

    return jsonify({'status': 'success'})


if __name__ == '__main__':
    app.run(debug=True, port=5001)
