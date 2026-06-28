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

  const readyStatus = document.getElementById("readyStatus");

  const clickSound = document.getElementById("clickSound");
  const winSound = document.getElementById("winSound");

  const lobby = document.getElementById("lobby");
  const game = document.getElementById("game");
  const roomInput = document.getElementById("roomInput");
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

  let username = prompt("Enter your name:");
  let roomId = "";
  let player = "";
  let gameActive = false;

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

    alert("✅ Room Created!\nRoom ID: " + roomId); // 🔥 SHOW ID

    startGame();
  };

  // JOIN ROOM
  joinBtn.onclick = async () => {
    roomId = roomInput.value.trim();
    if (!roomId) return alert("Enter Room ID");

    const roomRef = ref(db, "rooms/" + roomId);
    const snap = await get(roomRef);

    if (!snap.exists()) return alert("❌ No room found!");

    const data = snap.val();

    // 🔥 CHECK IF FULL
    if (data.players && data.players.X && data.players.O) {
      return alert("🚫 Room is FULL!");
    }

    player = "O";

    await update(roomRef, {
      "players/O": username
    });

    startGame();
  };

  function startGame() {
    lobby.style.display = "none";
    game.style.display = "block";
    roomDisplay.textContent = "Room: " + roomId;
    listenRoom();
  }

  // READY
  readyBtn.onclick = async () => {
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

      // WAIT READY
      if (!data.ready.X || !data.ready.O) {
        gameActive = false;

        const opponent = player === "X" ? "O" : "X";

        if (data.ready[player]) {
          statusText.textContent = "You are READY ✔";
          readyStatus.textContent = data.ready[opponent]
            ? "Your opponent is READY ✔"
            : "Waiting for opponent...";
        } else {
          statusText.textContent = "Click READY to start";
          readyStatus.textContent = "";
        }

        return;
      }

      if (data.ready.X && data.ready.O && !data.turn) {

        const roomSnap = await get(roomRef);
        const latest = roomSnap.val();

        if (latest.turn) return; // 🔒 someone already set it

        const randomTurn = Math.random() < 0.5 ? "X" : "O";

        await update(roomRef, {
          turn: randomTurn,
          started: true
        });

        return;
      }

      // WIN FIX
      if (data.winner) {
        gameActive = false;

        document.body.classList.remove("win", "lose", "draw");

        const newMatchCount = (data.matchCount || 0) + 1;
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

          let finalWinner = data.scores.X > data.scores.O ? "X" : "O";
          let finalName = data.players[finalWinner];

          statusText.innerHTML = `🏆 FINAL WINNER: ${finalName} (${finalWinner})`;

          playSound(finalWinSound, 500);

          // 🚫 STOP AUTO RESET - WAIT MODE
          await update(ref(db, "rooms/" + roomId), {
            turn: "",
            winner: "final",
          });

          setTimeout(async () => {

            const playAgain = confirm("Game Over!\nPlay Again?");

            if (playAgain) {

              await update(ref(db, "rooms/" + roomId), {
                scores: { X: 0, O: 0 },
                matchCount: 0,
                board: Array(9).fill(""),
                turn: "",
                winner: "",
                winCombo: [],
                ready: { X: false, O: false },
                started: false
              });

            } else {
              // ❗ stay or delete optional
              const leave = confirm("Leave room?");
              if (leave) {
                await remove(ref(db, "rooms/" + roomId));
                location.reload();
              }
            }

          }, 800);

          return;
        }
        // NEXT ROUND
        setTimeout(async () => {

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
      c.textContent = board[i];
      c.classList.remove("win"); // 🔥 IMPORTANT RESET EVERY UPDATE
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
