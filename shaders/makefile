CC = clang
CFLAGS = -O2 -Wall -Wextra -Wno-deprecated-declarations
INCS = -I/opt/homebrew/include       # use /usr/local/include on Intel
LIBS = -L/opt/homebrew/lib -lglfw -framework Cocoa -framework OpenGL -framework IOKit

BIN = toy
SRC = main.c

all: $(BIN)

$(BIN): $(SRC)
	$(CC) $(SRC) -o $@ $(CFLAGS) $(INCS) $(LIBS)

run: $(BIN)
	./$(BIN)

clean:
	rm -f $(BIN)
