from flask import Flask, render_template, request, jsonify
from boardgamegeek import BGGClient
from boardgamegeek.objects.games import CollectionBoardGame
import os
import posixpath
import json

app = Flask(__name__)

bgg = BGGClient()

# Save selected games to a JSON file
SELECTED_GAMES_FILE = 'data/selected_games.json'


def load_selected_games():
    if os.path.exists(SELECTED_GAMES_FILE):
        with open(SELECTED_GAMES_FILE, 'r') as file:
            return json.load(file)
    return []


def save_selected_games(selected_games):
    with open(SELECTED_GAMES_FILE, 'w') as file:
        json.dump(selected_games, file)


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
            games = {
                game.id: {
                    'name': game.name,
                    'thumbnail': game.thumbnail,
                    'year_published': game.year,
                    'min_players': game.min_players,
                    'max_players': game.max_players,
                    'playing_time': game.playing_time,
                    'plays': game.numplays,
                    'rating': game.rating
                }
                for game in collection
            }
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


@app.route('/api/selected_games', methods=['GET', 'POST'])
def selected_games():
    if request.method == 'GET':
        selected_games = load_selected_games()
        return jsonify(selected_games)
    elif request.method == 'POST':
        selected_games = request.json.get('selected_games', [])
        save_selected_games(selected_games)
        return jsonify({'status': 'success'})


if __name__ == '__main__':
    app.run(debug=True, port=5001)
