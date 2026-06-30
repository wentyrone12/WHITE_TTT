import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "confesskana-46bed.firebaseapp.com",
  databaseURL: "https://confesskana-46bed-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "confesskana-46bed",
  storageBucket: "confesskana-46bed.appspot.com",
  messagingSenderId: "1002183591382",
  appId: "1:1002183591382:web:c97c733dabb293f55e9077"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const chatNotif = document.getElementById("chatNotif");

let lastChatLength = 0;

function playSound(sound, delay = 0, duration = null) {
  setTimeout(() => {
    sound.currentTime = 2;
    sound.play().catch(() => { });

    // 🔥 AUTO STOP AFTER X SECONDS
    if (duration) {
      setTimeout(() => {
        sound.pause();
        sound.currentTime = 0;
      }, duration);
    }

  }, delay);
}

window.onload = () => {

  const popup = document.getElementById("popup");
  const popupInput = document.getElementById("popupInput");
  const popupTitle = document.getElementById("popupTitle");
  const popupOK = document.getElementById("popupOK");
  const popupCancel = document.getElementById("popupCancel");

  const popupRoom = document.getElementById("popupRoom");
  const generatedRoom = document.getElementById("generatedRoom");
  const copyRoomBtn = document.getElementById("copyRoomBtn");

  const readyStatus = document.getElementById("readyStatus");
  const playerXReady = document.getElementById("playerXReady");
  const playerOReady = document.getElementById("playerOReady");

  const clickSound = document.getElementById("clickSound");
  const winSound = document.getElementById("winSound");

  const lobby = document.getElementById("lobby");
  const game = document.getElementById("game");
  const createBtn = document.getElementById("createBtn");
  const joinBtn = document.getElementById("joinBtn");

  const statusText = document.getElementById("status");
  const roomDisplay = document.getElementById("roomDisplay");
  const quitBtn = document.getElementById("quitBtn");

  const chatToggle = document.getElementById("chatToggle");
  const chatPanel = document.getElementById("chatPanel");
  const closeChat = document.getElementById("closeChat");

  const chatText = document.getElementById("chatText");
  const sendChat = document.getElementById("sendChat");
  const chatMessages = document.getElementById("chatMessages");

  const cells = document.querySelectorAll(".cell");

  let isReady = false;

  let username = "";
  let roomId = "";
  let player = "";
  let gameActive = false;

  popup.style.display = "flex";

  popupOK.onclick = () => {

    if (!popupInput.value.trim())
      return;

    username = popupInput.value.trim();

    popup.style.display = "none";

  };

  popupCancel.onclick = () => {

    popup.style.display = "none";

    popupInput.value = "";

  };

  // ✅ CHAT TOGGLE FIX
  chatToggle.onclick = () => {
    chatPanel.classList.toggle("hidden");

    // 🔥 REMOVE RED DOT PAG BINUKSAN
    if (!chatPanel.classList.contains("hidden")) {
      chatNotif.classList.add("hidden");
    }
  };

  closeChat.onclick = () => {
    chatPanel.classList.add("hidden");
  };

  // CREATE ROOM
  createBtn.onclick = async () => {

    roomId = generateRoomId(); // 🔥 AUTO ID
    player = "X";

    await set(ref(db, "rooms/" + roomId), {
      board: Array(9).fill(""),
      turn: "",
      winner: "",
      ready: { X: false, O: false },
      players: { X: username, O: "" },
      scores: { X: 0, O: 0 },
      matchCount: 0,
      maxMatches: 10,
      chat: [],
      started: false
    });

    generatedRoom.innerHTML = roomId;

    popupTitle.innerHTML = "Room Created!";

    popupInput.style.display = "none";

    popupRoom.style.display = "block";

    popupCancel.style.display = "inline-block";

    popupOK.innerHTML = "Start Game";

    popup.style.display = "flex";

    popupOK.onclick = async () => {

      popup.style.display = "none";

      startGame();

    };
  };

  copyRoomBtn.onclick = () => {

    navigator.clipboard.writeText(roomId);

    copyRoomBtn.innerHTML = "✅ Copied!";

    setTimeout(() => {

      copyRoomBtn.innerHTML = "📋 Copy Room ID";

    }, 1500);

  };

  // JOIN ROOM
  joinBtn.onclick = () => {

    popup.style.display = "flex";

    popupTitle.innerHTML = "Enter Room ID";

    popupInput.style.display = "block";
    popupRoom.style.display = "none";

    popupCancel.style.display = "inline-block";

    popupInput.value = "";
    popupInput.placeholder = "Room ID";

    popupOK.innerHTML = "Join";

    popupOK.onclick = async () => {

      roomId = popupInput.value.trim();

      if (!roomId) {
        alert("Enter Room ID");
        return;
      }

      const roomRef = ref(db, "rooms/" + roomId);
      const snap = await get(roomRef);

      if (!snap.exists()) {
        alert("❌ No room found!");
        return;
      }

      const data = snap.val();

      if (data.players && data.players.X && data.players.O) {
        alert("🚫 Room is FULL!");
        return;
      }

      player = "O";

      await update(roomRef, {
        "players/O": username
      });

      popup.style.display = "none";

      startGame();
    };

  };

  function startGame() {
    lobby.style.display = "none";
    game.style.display = "block";
    roomDisplay.textContent = "Room: " + roomId;
    listenRoom();
  }

  // READY
  readyBtn.onclick = async () => {

    readyBtn.disabled = true;

    readyBtn.innerHTML = "✅ READY";

    readyBtn.style.background = "#00ff99";
    readyBtn.style.color = "#000";
    readyBtn.style.cursor = "not-allowed";
    readyBtn.style.boxShadow = "0 0 20px #00ff99";
    readyBtn.style.transform = "scale(.97)";

    await update(ref(db, "rooms/" + roomId + "/ready"), {
      [player]: true
    });

  };

  // QUIT
  quitBtn.onclick = async () => {
    const roomRef = ref(db, "rooms/" + roomId);
    const snap = await get(roomRef);
    const data = snap.val();

    if (!data) return;

    data.players[player] = "";

    if (!data.players.X && !data.players.O) {
      await remove(roomRef);
    } else {
      await update(roomRef, { players: data.players });
    }

    location.reload();
  };

  function listenRoom() {
    const roomRef = ref(db, "rooms/" + roomId);

    const DRAW_DELAY = 0; // 👉 pwede mo baguhin (milliseconds)

    onValue(roomRef, async (snap) => {
      const data = snap.val();

      if (!data) {
        alert("Room deleted!");
        location.reload();
        return;
      }

      // SAFE DEFAULTS
      if (!data.players) data.players = { X: "", O: "" };
      if (!data.scores) data.scores = { X: 0, O: 0 };
      if (!data.ready) data.ready = { X: false, O: false };

      updateBoard(data.board);

      const xBox = playerXReady.parentElement;
      const oBox = playerOReady.parentElement;

      // PLAYER X
      if (data.ready.X) {

        playerXReady.innerHTML = "✅ " + (data.players.X || "Player X");
        xBox.classList.add("ready");
        xBox.classList.remove("wait");

      } else {

        playerXReady.innerHTML = "❌ " + (data.players.X || "Player X");
        xBox.classList.remove("ready");
        xBox.classList.add("wait");

      }

      // PLAYER O
      if (data.ready.O) {

        playerOReady.innerHTML = "✅ " + (data.players.O || "Player O");
        oBox.classList.add("ready");
        oBox.classList.remove("wait");

      } else {

        playerOReady.innerHTML = "❌ " + (data.players.O || "Player O");
        oBox.classList.remove("ready");
        oBox.classList.add("wait");

      }

      // WAIT READY

      if (data.ready[player]) {

        readyBtn.disabled = true;
        readyBtn.innerHTML = "✅ READY";
        readyBtn.style.background = "#00ff99";
        readyBtn.style.color = "#000";
        readyBtn.style.cursor = "not-allowed";
        readyBtn.style.boxShadow = "0 0 20px #00ff99";

      } else {

        readyBtn.disabled = false;
        readyBtn.innerHTML = "READY";
        readyBtn.style.background = "";
        readyBtn.style.color = "";
        readyBtn.style.cursor = "pointer";
        readyBtn.style.boxShadow = "";

      }

      if (data.ready.X && data.ready.O && !data.started) {

        const roomSnap = await get(roomRef);
        const latest = roomSnap.val();

        if (latest.started) return;

        const randomTurn = Math.random() < 0.5 ? "X" : "O";

        await update(roomRef, {
          turn: randomTurn,
          started: true
        });

        return;
      }

      // WAIT UNTIL BOTH READY
      if (!data.ready.X || !data.ready.O) {

        gameActive = false;

        statusText.textContent = data.ready[player]
          ? "Waiting for opponent..."
          : "Click READY to start";

        return;
      }

      // BOTH READY -> START GAME
      if (!data.started) {

        if (player === "X") {

          const randomTurn = Math.random() < 0.5 ? "X" : "O";

          await update(roomRef, {
            started: true,
            turn: randomTurn
          });

        }

        return;
      }

      if (!data.turn) return;

      // WIN FIX
      if (data.winner === "final") {

        gameActive = false;

        const finalWinner =
          data.scores.X > data.scores.O
            ? data.players.X
            : data.scores.O > data.scores.X
              ? data.players.O
              : "DRAW";

        statusText.innerHTML = `🏆 FINAL WINNER : ${finalWinner}`;

        if (data.winCombo) {

          cells.forEach(c => c.classList.remove("win", "lose"));

          data.winCombo.forEach(i => {
            if (player === data.winnerPlayer) {
              cells[i].classList.add("win");
            } else {
              cells[i].classList.add("lose");
            }
          });

        }

        playSound(finalWinSound, 0);

        setTimeout(async () => {

          const playAgain = confirm(`🏆 ${finalWinner}\n\nPlay Again?`);

          if (player === "X") {

            if (playAgain) {

              await update(roomRef, {
                board: Array(9).fill(""),
                turn: "",
                winner: "",
                winnerPlayer: "",
                winCombo: [],
                ready: { X: false, O: false },
                started: false,
                scores: { X: 0, O: 0 },
                matchCount: 0
              });

            } else {

              await remove(roomRef);

            }

          }

        }, 2000);

        return;
      }

      if (data.winner && data.winner !== "final") {

        gameActive = false;

        document.body.classList.remove("win", "lose", "draw");

        const newMatchCount = data.matchCount + 1;
        const maxMatches = data.maxMatches || 10;

        // DRAW
        if (data.winner === "draw") {
          document.body.classList.add("draw");
          statusText.innerHTML = "It's a DRAW!";
          playSound(drawSound, 0, 2500);

          setTimeout(async () => {
            document.body.classList.remove("win", "lose", "draw");

            await update(ref(db, "rooms/" + roomId), {
              board: Array(9).fill(""),
              turn: "",
              winner: "",
              ready: { X: false, O: false },
              started: false
            });
          }, 1000);

          return;
        }

        const winnerName = data.players[data.winner];
        statusText.innerHTML = `${winnerName} (${data.winner}) wins 🎉`;

        // WIN / LOSE EFFECT
        const combo = data.winCombo;

        cells.forEach(c => c.classList.remove("win", "lose"));

        if (combo && combo.length) {
          for (let i of combo) {
            if (data.winner === player) {
              cells[i].classList.add("win");   // 🟢 ONLY WINNING 3 CELLS
            } else {
              cells[i].classList.add("lose");  // 🔴 ONLY WINNING 3 CELLS
            }
          }
        }

        playSound(winSound, 0);

        // FINAL WIN CHECK
        if (newMatchCount >= maxMatches) {

          gameActive = false;

          await update(roomRef, {
            [`scores/${data.winner}`]: data.scores[data.winner] + 1,
            matchCount: newMatchCount,
            winner: "final",
            winnerPlayer: data.winner,
            winCombo: data.winCombo
          });

          statusText.innerHTML =
            `🏆 FINAL WINNER: ${winnerName}`;

          playSound(finalWinSound, 500);

          setTimeout(async () => {

            const playAgain = confirm("Game Over!\n\nPlay Again?");

            if (playAgain) {

              await update(roomRef, {

                scores: { X: 0, O: 0 },

                board: Array(9).fill(""),

                turn: "",

                winner: "",

                winCombo: [],

                matchCount: 0,

                ready: {
                  X: false,
                  O: false
                },

                started: false

              });

            } else {

              await remove(roomRef);

              location.reload();

            }

          }, 2000);

          return;

        }
        // NEXT ROUND
        setTimeout(async () => {

          if (player !== "X") return;

          cells.forEach(c => {
            c.classList.remove("win", "lose");
          });

          document.body.classList.remove("win", "lose", "draw");

          await update(ref(db, "rooms/" + roomId), {
            [`scores/${data.winner}`]: data.scores[data.winner] + 1,
            matchCount: newMatchCount,
            board: Array(9).fill(""),
            turn: "",
            winner: "",
            winCombo: [],
            ready: { X: false, O: false },
            started: false
          });

        }, 1500);
        return;
      }

      // TURN DISPLAY + SCORE
      const currentName = data.players[data.turn] || "Player";

      statusText.innerHTML =
        `Turn: ${currentName} (${data.turn})<br>
   Score → ${data.players.X || "X"}: ${data.scores.X} | ${data.players.O || "O"}: ${data.scores.O}<br>
   Match: ${data.matchCount || 0} / ${data.maxMatches}`;

      gameActive = true;

      // CHAT DISPLAY
      // CHAT DISPLAY
      const chats = data.chat || [];

      // 🔥 CHECK NEW MESSAGE
      if (chats.length > lastChatLength) {
        if (chatPanel.classList.contains("hidden")) {
          chatNotif.classList.remove("hidden");
        }
      }

      lastChatLength = chats.length;

      chatMessages.innerHTML = "";
      chats.forEach(msg => {
        const div = document.createElement("div");
        div.textContent = `${msg.name}: ${msg.text}`;
        chatMessages.appendChild(div);
      });

      chatMessages.scrollTop = chatMessages.scrollHeight;
    });


    // CLICK CELL
    cells.forEach(cell => {
      cell.onclick = async () => {
        if (!gameActive) return;

        const index = cell.dataset.index;
        const roomRef = ref(db, "rooms/" + roomId);
        const snap = await get(roomRef);
        const data = snap.val();

        if (!data || data.board[index] !== "" || data.turn !== player) return;

        data.board[index] = player;

        const combo = checkWinner(data.board);
        const draw = isDraw(data.board);

        if (combo) {
          await update(roomRef, {
            board: data.board,
            winner: player, // temporary, aayusin sa listener
            winCombo: combo
          });
        } else if (draw) {
          await update(roomRef, {
            board: data.board,
            winner: "draw"
          });
        } else {
          await update(roomRef, {
            board: data.board,
            turn: player === "X" ? "O" : "X"
          });
        }

        playSound(clickSound);
      };
    });
  }

  function highlightWin(combo) {
    combo.forEach(i => {
      cells[i].classList.add("win");
    });

    // auto remove after 1 second (smooth effect)
    setTimeout(() => {
      combo.forEach(i => {
        cells[i].classList.remove("win");
      });
    }, 1000);
  }

  function updateBoard(board) {
    cells.forEach((c, i) => {
      c.textContent = board[i] || "";

      // 🔥 ALWAYS RESET COLORS EVERY SYNC
      c.classList.remove("win", "lose");
    });
  }

  function highlightWin(combo) {
    combo.forEach(i => {
      cells[i].classList.add("win");
    });
  }

  function checkWinner(b) {
    const w = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (let combo of w) {
      const [a, b1, c1] = combo;

      if (b[a] && b[a] === b[b1] && b[a] === b[c1]) {
        return combo; // 🔥 FIX: return ONLY combo, not winner yet
      }
    }

    return null;
  }

  // SEND CHAT
  sendChat.onclick = async () => {
    if (!chatText.value.trim() || !roomId) return;

    const roomRef = ref(db, "rooms/" + roomId);
    const snap = await get(roomRef);
    const data = snap.val();

    const newChat = data.chat || [];

    newChat.push({
      name: username,
      text: chatText.value
    });

    await update(roomRef, {
      chat: newChat
    });

    chatText.value = "";
  };

};

function isDraw(board) {
  return board.every(cell => cell !== "");
}
