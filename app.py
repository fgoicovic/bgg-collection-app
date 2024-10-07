from flask import Flask, render_template, request, jsonify
from boardgamegeek import BGGClient
from boardgamegeek.objects.games import CollectionBoardGame

from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

import os
import posixpath
import json
import collections
import html

from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

bgg = BGGClient()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/fetch-collection')
def fetch_collection():
    return render_template('fetch_collection.html')


@app.route('/compare-lists')
def compare_lists():
    return render_template('compare_lists.html')


@app.route('/api/selected-lists', methods=['GET'])
def selected_lists():
    files = os.listdir("data")
    selected_lists = [file.removesuffix("-selected.enc") for file in files if file.endswith("-selected.enc")]
    return jsonify(selected_lists)


@app.route('/api/compare-selection', methods=['GET', 'POST'])
def compare_selection():
    list_names = request.args.get('lists')
    list_names = list_names.split(',')

    password = os.getenv('APP_MASTER_PASSWORD')
    if not password:
        raise ValueError("Password not found in environment variables")

    # Get the salt and encrypted data for each list
    selected_games = []
    for i, list_name in enumerate(list_names):
        user_password = read_encrypted_data(f"{list_name}-password.enc", password)
        data = read_encrypted_data(f"{list_name}-selected.enc", user_password)
        data = json.loads(data)
        games = data.get('selected_games', [])
        selected_games.extend(games)
        if i == 0:
            continue
        # Find the repeated elements in the list, starting from the second list
        common_games = [item for item, count in collections.Counter(selected_games).items() if count > 1]
        selected_games = common_games

    return jsonify(list(common_games))


def _read_data_file(filepath):
    try:
        with open(filepath, "rb") as fb:
            data = fb.read()
            games = json.loads(data.decode())
    except Exception as e:
        return None

    return games


@app.route('/api/collection', methods=['GET', 'POST'])
def get_collection():
    username = request.args.get('username')
    games = None
    if request.method == 'POST':
        games = _get_collection_from_bgg(username)
    else:
        filepath = f"data/{username}.json"
        if posixpath.isfile(filepath):
            games = _read_data_file(filepath)
        else:
            games = _get_collection_from_bgg(username)

    if not games:
        return jsonify({'error': f'Unable to fetch collection for {username}'}), 500

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


@app.route('/api/game_details/<game_id>', methods=['GET'])
def get_game_name(game_id):
    game = bgg.game(game_id=game_id)
    name = f"{game.name} ({game.year})"
    return jsonify({'name': name})


@app.route('/api/selected_games', methods=['POST'])
def selected_games():
    selected_games = request.json.get('selected_games', [])
    username: str = request.json.get('user_name')
    password: str = request.json.get('user_password')
    collection: str = request.json.get('collection')

    output = {
        collection: collection,
        'selected_games': selected_games
    }
    output_data = json.dumps(output)

    store_encrypted_data(f"{username}-selected.enc", password, output_data)
    app_password = os.getenv('APP_MASTER_PASSWORD')
    if not app_password:
        raise ValueError("Password not found in environment variables")
    store_encrypted_data(f"{username}-password.enc", app_password, password)

    return jsonify({'status': 'success'})


# Function to generate a key from the password
def derive_key(password: str, salt: bytes) -> bytes:
    kdf = Scrypt(
        salt=salt,
        length=32,
        n=2**14,
        r=8,
        p=1,
        backend=default_backend()
    )
    key = kdf.derive(password.encode())
    return key


def read_encrypted_data(filename, password):
    data_file = f"data/{filename}"

    with open(data_file, "rb") as fb:
        encrypted_data = fb.read()

    # Extract the salt (first 16 bytes) and the IV (next 16 bytes)
    salt = encrypted_data[:16]
    iv = encrypted_data[16:32]
    encrypted_content = encrypted_data[32:]

    # Derive the key using the password and salt
    key = derive_key(password, salt)

    # Create an AES cipher in CBC mode for decryption
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()

    # Decrypt the data
    padded_data = decryptor.update(encrypted_content) + decryptor.finalize()

    # Remove padding
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()

    # Convert the decrypted bytes back to a string
    return data.decode()


def store_encrypted_data(filename: str, password: str, data: str):
    salt = os.urandom(16)
    # Derive the key using the password and salt
    key = derive_key(password, salt)

    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()

    file_path = f"data/{filename}"
    # Convert the input string to bytes
    data_bytes = data.encode()

    # Pad the data to be a multiple of the block size (AES block size is 128 bits)
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(data_bytes) + padder.finalize()

    # Encrypt the data
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

    # Write the encrypted data, along with the salt and IV, to the output file
    with open(file_path, 'wb') as f:
        f.write(salt)  # Save the salt first
        f.write(iv)    # Save the IV
        f.write(encrypted_data)

    print(f"Encrypted data and saved as '{file_path}'")


def _get_collection_from_bgg(username: str):
    games = {}
    try:
        collection: list[CollectionBoardGame] = bgg.collection(
            username, own=True, exclude_subtype="boardgameexpansion"
        )
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
                'name': html.escape(game.name),
                'thumbnail': game.thumbnail,
                'year_published': game.year,
                'players': players,
                "playing_time": playing_time,
                'plays': game.numplays,
                'rating': game.rating,
                # 'comment': html.escape(game.comment) TODO: Fix special characters in comment
            }
            games[game.id] = game_dict

        filepath = f"data/{username}.json"
        with open(filepath, "wb") as fb:
            data = json.dumps(games)
            fb.write(data.encode())

    except Exception as e:
        return {}

    return games


if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
