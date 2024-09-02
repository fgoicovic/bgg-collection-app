from flask import Flask, render_template, request, jsonify
from boardgamegeek import BGGClient
import os
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


@app.route('/api/collection', methods=['GET'])
def get_collection():
    username = request.args.get('username')
    try:
        collection = bgg.collection(username, own=True, exclude_subtype="boardgameexpansion")
        games = [{
            'id': game.id,
            'name': game.name,
            'thumbnail': game.thumbnail,
            'year_published': game.year,
            'min_players': game.min_players,
            'max_players': game.max_players,
            'playing_time': game.playing_time
        } for game in collection]
        return jsonify(games)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/game_details/<int:game_id>', methods=['GET'])
def get_game_details(game_id):
    try:
        game = bgg.game(game_id=game_id)
        game_details = {
            'name': game.name,
            'description': game.description,
            'thumbnail': game.thumbnail,
            'image': game.image,
            'year_published': game.year,
            'min_players': game.min_players,
            'max_players': game.max_players,
            'playing_time': game.playing_time,
            'rating': game.rating_average,
            'mechanics': game.mechanics
        }
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
    app.run(debug=True)
