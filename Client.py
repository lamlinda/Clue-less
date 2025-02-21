import socket

def main():
    client_socket = startClient()

    while True:
        data = client_socket.recv(1024)
        print(f"Server: \n {data.decode()}")
        
        msg = input("You: ")
        if msg.lower() == 'exit':
            break
        client_socket.sendall(msg.encode())

    client_socket.close()


def startClient():
    HOST = '127.0.0.1'  # Server address
    PORT = 12345        # Server port

    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client_socket.connect((HOST, PORT))

    return client_socket


if __name__=="__main__":
    main()