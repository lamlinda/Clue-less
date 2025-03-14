from flask import Flask, render_template
from extensions import db, socketio
from routes.lobby import lobby_bp

HOST = "0.0.0.0"
PORT = 5000

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///game.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

db.init_app(app)
socketio.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/test')
def test():
    return render_template('webLayout.html')



app.register_blueprint(lobby_bp, url_prefix='/lobby')




if __name__ == '__main__':
    socketio.run(app, host=HOST, port=PORT, debug=True)
