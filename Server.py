import socket

#Main function starts the server and calls game functions
def main():
    server_socket, conn = startServer()

    #initial position of the player (middle of board)
    data = 4

    #send and recieve messages from the client
    try:
        while True:
            #send the current board as a string to the client
            boardString = printGameBoard(data)
            sendMessage(conn, boardString)

            #receive data from client. This should be a position the player wants to move to
            #on the board
            data = conn.recv(1024)
            if not data:
                print("Client disconnected.")
                break  # Exit loop if the client closes the connection

    except ConnectionAbortedError:
        print("Connection was closed by the client.")
    except ConnectionResetError:
        print("Connection was forcibly closed by the client.")
    finally:
        conn.close()
        server_socket.close()


#Function to start the server and listen to the Client
def startServer():
    HOST = '127.0.0.1'  # Localhost
    PORT = 12345        # Port to listen on

    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.bind((HOST, PORT))
    server_socket.listen()

    print(f"Server listening on {HOST}:{PORT}...")

    conn, addr = server_socket.accept()
    print(f"Connected by {addr}")

    return server_socket, conn


#function to send a message to the client
def sendMessage(conn, message):
    conn.sendall(message.encode())


#returns a string that contains the gameboard with the player on it
def printGameBoard(movePosition):
    boardString = ""
    characterPositons = [[' ' for _ in range(3)] for _ in range(3)]

    #check if valid position to move into
    if int(movePosition) > 8:
        return "Invalid position to move into"

    #calculate row and column player moved to
    row = int(movePosition) / 3
    column = int(movePosition) % 3
    characterPositons[int(row)][int(column)] = str(1)  # Place player number at the specified position

    #create the string that will be the game board
    for i in range(3):  # There are 3 rows
        for j in range(3):  # There are 3 columns
            boardString += "\t \t " + characterPositons[i][j]
            if j < 2:
                boardString += " | "
        boardString += "\n"
        if i < 2:
            boardString += "_" * 55 + "\n"  # Add the horizontal divider

    return boardString
        

if __name__=="__main__":
    main()