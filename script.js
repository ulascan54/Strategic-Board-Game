document.addEventListener("DOMContentLoaded", () => {
  const boardElement = document.getElementById("board")
  const historyList = document.getElementById("historyList")
  const difficultySelect = document.getElementById("difficulty")
  const restartButton = document.getElementById("restart")
  const muteButton = document.getElementById("muteButton")
  const muteIcon = document.getElementById("muteIcon")

  // Get elements for the rules modal
  const openRulesButton = document.getElementById("openRulesButton")
  const rulesModal = document.getElementById("rulesModal")
  const closeRulesButton = document.getElementById("closeRulesButton")

  // Get the play overlay
  const playOverlay = document.getElementById("playOverlay")

  // Event listener to open the modal
  openRulesButton.addEventListener("click", () => {
    rulesModal.style.display = "block"
  })

  // Event listener to close the modal
  closeRulesButton.addEventListener("click", () => {
    rulesModal.style.display = "none"
  })

  // Close the modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target == rulesModal) {
      rulesModal.style.display = "none"
    }
  })

  let isMuted = false

  // Sound files
  const backgroundMusic = new Audio("sound1.mp3")
  backgroundMusic.loop = true
  backgroundMusic.volume = 0.2
  backgroundMusic.playbackRate = 1.5
  const moveSound = new Audio("sound2.mp3")
  const captureSound = new Audio("sound3.mp3")
  const invalidMoveSound = new Audio("sound4.mp3")

  let board = []
  let moveHistory = []
  let currentPlayer = "ai" // AI starts first
  let moveCount = 0
  let gameEnded = false
  let gameStarted = false

  const directions = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 }, // Right
    { x: 0, y: 1 }, // Down
    { x: -1, y: 0 }, // Left
  ]

  function initBoard() {
    board = []
    boardElement.innerHTML = ""
    for (let y = 0; y < 7; y++) {
      let row = []
      for (let x = 0; x < 7; x++) {
        let cell = {
          x: x,
          y: y,
          piece: null, // 'triangle', 'circle' or null
        }
        let cellElement = document.createElement("div")
        cellElement.classList.add("cell")
        cellElement.dataset.x = x
        cellElement.dataset.y = y
        cell.element = cellElement
        boardElement.appendChild(cellElement)
        row.push(cell)
      }
      board.push(row)
    }
    initPieces()

    // Show the PLAY overlay
    playOverlay.style.display = "flex"
    gameStarted = false
  }

  function initPieces() {
    // Initial positions of the pieces
    let aiPositions = [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 6, y: 4 },
      { x: 6, y: 6 },
    ]
    let humanPositions = [
      { x: 0, y: 6 },
      { x: 6, y: 0 },
      { x: 6, y: 2 },
      { x: 0, y: 4 },
    ]

    aiPositions.forEach((pos, index) => {
      placePiece(pos.x, pos.y, "triangle", `ai_${index}`)
    })

    humanPositions.forEach((pos, index) => {
      placePiece(pos.x, pos.y, "circle", `human_${index}`)
    })
  }

  function placePiece(x, y, type, id) {
    let cell = board[y][x]
    cell.piece = type
    let pieceElement = document.createElement("div")
    pieceElement.classList.add("piece", type)
    pieceElement.dataset.x = x
    pieceElement.dataset.y = y
    pieceElement.dataset.id = id
    cell.element.appendChild(pieceElement)
  }

  function removePiece(x, y) {
    let cell = board[y][x]
    cell.piece = null
    while (cell.element.firstChild) {
      cell.element.removeChild(cell.element.firstChild)
    }
  }

  function movePiece(fromX, fromY, toX, toY) {
    let pieceType = board[fromY][fromX].piece
    let pieceElement = board[fromY][fromX].element.firstChild
    let pieceId = pieceElement ? pieceElement.dataset.id : null
    removePiece(fromX, fromY)
    placePiece(toX, toY, pieceType, pieceId)
    addMoveToHistory(pieceType, fromX, fromY, toX, toY)

    // Play moveSound when a piece is moved
    if (!isMuted) {
      moveSound.play()
    }
  }

  function addMoveToHistory(pieceType, fromX, fromY, toX, toY) {
    moveHistory.push({
      player: pieceType === "triangle" ? "AI" : "Human",
      pieceType: pieceType,
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY },
    })
    let moveText = `${moveHistory.length}. ${
      pieceType === "triangle" ? "AI" : "Human"
    } moved from (${fromX},${fromY}) to (${toX},${toY})`

    // Remove 'last-move' class from the previous last move
    const previousLastMove = historyList.querySelector(".last-move")
    if (previousLastMove) {
      previousLastMove.classList.remove("last-move")
    }

    let li = document.createElement("li")
    li.textContent = moveText

    // Add CSS class based on the player who made the move
    if (pieceType === "triangle") {
      li.classList.add("ai-move")
    } else {
      li.classList.add("human-move")
    }

    // Add 'last-move' class to highlight the last move
    li.classList.add("last-move")

    historyList.appendChild(li)

    // Scroll the move history to the bottom
    historyList.scrollTop = historyList.scrollHeight
  }

  function humanMove() {
    let selectedPiece = null
    let availableMoves = []
    let humanMovesMade = 0
    let movedPieces = []

    function deselectPiece() {
      if (selectedPiece) {
        let cell = board[selectedPiece.y][selectedPiece.x]
        if (cell.element.firstChild) {
          cell.element.firstChild.classList.remove("selected")
        }
        unhighlightAvailableMoves()
        selectedPiece = null
        availableMoves = []
      }
    }

    function getAvailableMoves(x, y) {
      let moves = []
      directions.forEach((dir) => {
        let newX = x + dir.x
        let newY = y + dir.y
        if (isValidCell(newX, newY) && board[newY][newX].piece === null) {
          moves.push({ x: newX, y: newY })
        }
      })
      return moves
    }

    function highlightAvailableMoves() {
      availableMoves.forEach((move) => {
        board[move.y][move.x].element.classList.add("available")
      })
    }

    function unhighlightAvailableMoves() {
      availableMoves.forEach((move) => {
        board[move.y][move.x].element.classList.remove("available")
      })
    }

    function handleCellClick(event) {
      if (gameEnded || !gameStarted) return
      let x = parseInt(event.currentTarget.dataset.x)
      let y = parseInt(event.currentTarget.dataset.y)
      let cell = board[y][x]

      if (cell.piece === "circle") {
        let pieceElement = cell.element.firstChild
        let pieceId = pieceElement.dataset.id

        if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
          // Deselect the same piece if clicked again
          deselectPiece()
        } else if (!movedPieces.includes(pieceId)) {
          // Select a new piece
          deselectPiece()
          selectedPiece = { x: x, y: y, id: pieceId }
          if (pieceElement) {
            pieceElement.classList.add("selected")
          }
          availableMoves = getAvailableMoves(x, y)
          highlightAvailableMoves()
        } else {
          // This piece has already moved this turn
          if (!isMuted) {
            invalidMoveSound.play()
          }
          alert("You cannot move the same piece twice in a single turn.")
        }
      } else if (
        selectedPiece &&
        cell.element.classList.contains("available")
      ) {
        // Move the selected piece
        movePiece(selectedPiece.x, selectedPiece.y, x, y)
        movedPieces.push(selectedPiece.id)
        deselectPiece()
        checkCaptures()
        moveCount++
        humanMovesMade++
        checkGameEnd()
        if (gameEnded) return
        let humanPieces = getPlayerPieces("circle")
        let movesNeeded = humanPieces.length > 1 ? 2 : 1
        if (humanMovesMade >= movesNeeded) {
          currentPlayer = "ai"
          detachEventListeners()
          aiMove()
        } else {
          // Reset selection to allow the player to choose another piece
          deselectPiece()
        }
      } else {
        deselectPiece()
      }
    }

    function attachEventListeners() {
      board.forEach((row) => {
        row.forEach((cell) => {
          cell.element.addEventListener("click", handleCellClick)
        })
      })
    }

    function detachEventListeners() {
      board.forEach((row) => {
        row.forEach((cell) => {
          cell.element.removeEventListener("click", handleCellClick)
        })
      })
    }

    attachEventListeners()
  }

  function aiMove() {
    if (!gameStarted) return
    let aiPieces = getPlayerPieces("triangle")
    let movesNeeded = aiPieces.length > 1 ? 2 : 1
    let movesMade = 0
    let movedPieces = []

    function makeMove() {
      if (gameEnded || !gameStarted) return
      let bestMove = minimax(
        board,
        parseInt(difficultySelect.value),
        -Infinity,
        Infinity,
        true,
        movedPieces
      )
      if (bestMove && bestMove.move) {
        // Ensure AI moves different pieces
        let pieceId = getPieceId(bestMove.move.from.x, bestMove.move.from.y)
        if (movedPieces.includes(pieceId)) {
          // Find an alternative move with a different piece
          let alternativeMoves = getAllPossibleMoves(board, "triangle").filter(
            (move) =>
              !movedPieces.includes(getPieceId(move.from.x, move.from.y))
          )
          if (alternativeMoves.length > 0) {
            bestMove.move = alternativeMoves[0]
          } else {
            // No more moves this turn
            currentPlayer = "human"
            humanMove()
            return
          }
        }
        movePiece(
          bestMove.move.from.x,
          bestMove.move.from.y,
          bestMove.move.to.x,
          bestMove.move.to.y
        )
        movedPieces.push(pieceId)
        checkCaptures()
        moveCount++
        checkGameEnd()
        if (gameEnded) return
        movesMade++
        if (movesMade < movesNeeded) {
          setTimeout(makeMove, 500) // Short delay between AI moves
        } else {
          currentPlayer = "human"
          humanMove()
        }
      } else {
        gameEnded = true
        alert("AI cannot move. You win!")
      }
    }

    setTimeout(makeMove, 500) // Start AI move after a short delay
  }

  function getPieceId(x, y) {
    let cell = board[y][x]
    if (cell.element.firstChild) {
      return cell.element.firstChild.dataset.id
    }
    return null
  }

  function checkCaptures() {
    let toRemove = []

    // Existing capture logic
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        let cell = board[y][x]
        if (cell.piece) {
          let opponentPiece = cell.piece === "triangle" ? "circle" : "triangle"
          directions.forEach((dir) => {
            let currentX = x + dir.x
            let currentY = y + dir.y

            if (
              isValidCell(currentX, currentY) &&
              board[currentY][currentX].piece === opponentPiece
            ) {
              let beyondX = currentX + dir.x
              let beyondY = currentY + dir.y

              if (isValidCell(beyondX, beyondY)) {
                let beyondCell = board[beyondY][beyondX]
                if (beyondCell.piece === cell.piece) {
                  toRemove.push({ x: currentX, y: currentY })
                }
              } else {
                toRemove.push({ x: currentX, y: currentY })
              }
            }
          })
        }
      }
    }

    // New capture logic: Check for CTTC and TCCT patterns
    // Horizontal check
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x <= 7 - 4; x++) {
        let cell1 = board[y][x]
        let cell2 = board[y][x + 1]
        let cell3 = board[y][x + 2]
        let cell4 = board[y][x + 3]
        if (
          cell1.piece &&
          cell2.piece &&
          cell3.piece &&
          cell4.piece &&
          cell1.piece !== cell2.piece &&
          cell1.piece === cell4.piece &&
          cell2.piece === cell3.piece &&
          cell1.piece !== cell2.piece
        ) {
          // Remove the two middle pieces
          toRemove.push({ x: x + 1, y: y })
          toRemove.push({ x: x + 2, y: y })
        }
      }
    }

    // Vertical check
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y <= 7 - 4; y++) {
        let cell1 = board[y][x]
        let cell2 = board[y + 1][x]
        let cell3 = board[y + 2][x]
        let cell4 = board[y + 3][x]
        if (
          cell1.piece &&
          cell2.piece &&
          cell3.piece &&
          cell4.piece &&
          cell1.piece !== cell2.piece &&
          cell1.piece === cell4.piece &&
          cell2.piece === cell3.piece &&
          cell1.piece !== cell2.piece
        ) {
          // Remove the two middle pieces
          toRemove.push({ x: x, y: y + 1 })
          toRemove.push({ x: x, y: y + 2 })
        }
      }
    }

    // Filter unique positions to avoid removing the same piece multiple times
    let uniqueToRemove = []
    toRemove.forEach((pos) => {
      if (!uniqueToRemove.some((p) => p.x === pos.x && p.y === pos.y)) {
        uniqueToRemove.push(pos)
      }
    })

    // Remove captured pieces
    uniqueToRemove.forEach((pos) => {
      removePiece(pos.x, pos.y)
    })

    // Play captureSound if pieces were captured
    if (uniqueToRemove.length > 0 && !isMuted) {
      captureSound.play()
    }
  }

  function isValidCell(x, y) {
    return x >= 0 && x < 7 && y >= 0 && y < 7
  }

  function getPlayerPieces(pieceType) {
    let pieces = []
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (board[y][x].piece === pieceType) {
          pieces.push({ x: x, y: y })
        }
      }
    }
    return pieces
  }

  function evaluateBoard(boardState) {
    let aiScore = 0
    let humanScore = 0

    boardState.forEach((row) => {
      row.forEach((cell) => {
        if (cell.piece === "triangle") {
          aiScore += evaluatePiece(cell, boardState, "triangle")
        } else if (cell.piece === "circle") {
          humanScore += evaluatePiece(cell, boardState, "circle")
        }
      })
    })

    return aiScore - humanScore
  }

  function evaluatePiece(cell, boardState, pieceType) {
    let score = 10 // Base value for each piece
    let opponentType = pieceType === "triangle" ? "circle" : "triangle"

    // Check the cells around the piece
    directions.forEach((dir) => {
      let x = cell.x + dir.x
      let y = cell.y + dir.y
      if (isValidCell(x, y)) {
        let neighbor = boardState[y][x]
        if (neighbor.piece === opponentType) {
          // At risk if an opponent's piece is adjacent
          score -= 2
        } else if (neighbor.piece === pieceType) {
          // Safer if an ally is adjacent
          score += 1
        }
      } else {
        // Edge pieces might be riskier
        score -= 1
      }
    })

    return score
  }

  function minimax(
    boardState,
    depth,
    alpha,
    beta,
    isMaximizingPlayer,
    movedPieces = []
  ) {
    if (depth === 0 || isGameOver(boardState)) {
      return { score: evaluateBoard(boardState) }
    }

    let moves = getAllPossibleMoves(
      boardState,
      isMaximizingPlayer ? "triangle" : "circle"
    )

    // Filter to avoid moving the same piece twice
    moves = moves.filter(
      (move) => !movedPieces.includes(getPieceId(move.from.x, move.from.y))
    )

    if (moves.length === 0) {
      return { score: isMaximizingPlayer ? -Infinity : Infinity }
    }

    let bestMove = null

    if (isMaximizingPlayer) {
      let maxEval = -Infinity
      for (let move of moves) {
        let newBoard = makeMoveOnBoard(boardState, move)
        let newMovedPieces = [
          ...movedPieces,
          getPieceId(move.from.x, move.from.y),
        ]
        let result = minimax(
          newBoard,
          depth - 1,
          alpha,
          beta,
          false,
          newMovedPieces
        )
        if (result.score > maxEval) {
          maxEval = result.score
          bestMove = move
        }
        alpha = Math.max(alpha, maxEval)
        if (beta <= alpha) {
          break // Beta cutoff
        }
      }
      return { score: maxEval, move: bestMove }
    } else {
      let minEval = Infinity
      for (let move of moves) {
        let newBoard = makeMoveOnBoard(boardState, move)
        let newMovedPieces = [
          ...movedPieces,
          getPieceId(move.from.x, move.from.y),
        ]
        let result = minimax(
          newBoard,
          depth - 1,
          alpha,
          beta,
          true,
          newMovedPieces
        )
        if (result.score < minEval) {
          minEval = result.score
          bestMove = move
        }
        beta = Math.min(beta, minEval)
        if (beta <= alpha) {
          break // Alpha cutoff
        }
      }
      return { score: minEval, move: bestMove }
    }
  }

  function getAllPossibleMoves(boardState, pieceType) {
    let moves = []
    boardState.forEach((row) => {
      row.forEach((cell) => {
        if (cell.piece === pieceType) {
          directions.forEach((dir) => {
            let newX = cell.x + dir.x
            let newY = cell.y + dir.y
            if (
              isValidCell(newX, newY) &&
              boardState[newY][newX].piece === null
            ) {
              moves.push({
                from: { x: cell.x, y: cell.y },
                to: { x: newX, y: newY },
              })
            }
          })
        }
      })
    })
    return moves
  }

  function makeMoveOnBoard(boardState, move) {
    let newBoard = boardState.map((row) => row.map((cell) => ({ ...cell })))
    let pieceType = newBoard[move.from.y][move.from.x].piece
    newBoard[move.from.y][move.from.x].piece = null
    newBoard[move.to.y][move.to.x].piece = pieceType

    // Check for captures after the move
    newBoard = checkCapturesOnBoard(newBoard)
    return newBoard
  }

  function checkCapturesOnBoard(boardState) {
    let toRemove = []

    // Existing capture logic
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        let cell = boardState[y][x]
        if (cell.piece) {
          let opponentPiece = cell.piece === "triangle" ? "circle" : "triangle"
          directions.forEach((dir) => {
            let currentX = x + dir.x
            let currentY = y + dir.y

            if (
              isValidCell(currentX, currentY) &&
              boardState[currentY][currentX].piece === opponentPiece
            ) {
              let beyondX = currentX + dir.x
              let beyondY = currentY + dir.y

              if (isValidCell(beyondX, beyondY)) {
                let beyondCell = boardState[beyondY][beyondX]
                if (beyondCell.piece === cell.piece) {
                  toRemove.push({ x: currentX, y: currentY })
                }
              } else {
                toRemove.push({ x: currentX, y: currentY })
              }
            }
          })
        }
      }
    }

    // New capture logic: Check for CTTC and TCCT patterns
    // Horizontal check
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x <= 7 - 4; x++) {
        let cell1 = boardState[y][x]
        let cell2 = boardState[y][x + 1]
        let cell3 = boardState[y][x + 2]
        let cell4 = boardState[y][x + 3]
        if (
          cell1.piece &&
          cell2.piece &&
          cell3.piece &&
          cell4.piece &&
          cell1.piece !== cell2.piece &&
          cell1.piece === cell4.piece &&
          cell2.piece === cell3.piece &&
          cell1.piece !== cell2.piece
        ) {
          // Remove the two middle pieces
          toRemove.push({ x: x + 1, y: y })
          toRemove.push({ x: x + 2, y: y })
        }
      }
    }

    // Vertical check
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y <= 7 - 4; y++) {
        let cell1 = boardState[y][x]
        let cell2 = boardState[y + 1][x]
        let cell3 = boardState[y + 2][x]
        let cell4 = boardState[y + 3][x]
        if (
          cell1.piece &&
          cell2.piece &&
          cell3.piece &&
          cell4.piece &&
          cell1.piece !== cell2.piece &&
          cell1.piece === cell4.piece &&
          cell2.piece === cell3.piece &&
          cell1.piece !== cell2.piece
        ) {
          // Remove the two middle pieces
          toRemove.push({ x: x, y: y + 1 })
          toRemove.push({ x: x, y: y + 2 })
        }
      }
    }

    // Filter unique positions to avoid removing the same piece multiple times
    let uniqueToRemove = []
    toRemove.forEach((pos) => {
      if (!uniqueToRemove.some((p) => p.x === pos.x && p.y === pos.y)) {
        uniqueToRemove.push(pos)
      }
    })

    // Remove captured pieces
    uniqueToRemove.forEach((pos) => {
      boardState[pos.y][pos.x].piece = null
    })

    return boardState
  }

  function isGameOver(boardState) {
    let aiPieces = 0
    let humanPieces = 0

    boardState.forEach((row) => {
      row.forEach((cell) => {
        if (cell.piece === "triangle") aiPieces++
        if (cell.piece === "circle") humanPieces++
      })
    })

    return aiPieces === 0 || humanPieces === 0 || moveCount >= 50
  }

  function checkGameEnd() {
    let aiPieces = getPlayerPieces("triangle").length
    let humanPieces = getPlayerPieces("circle").length

    if (
      (aiPieces === 0 && humanPieces === 0) ||
      (aiPieces === 1 && humanPieces === 1)
    ) {
      gameEnded = true
      alert("Game over. It's a draw!")
    } else if (aiPieces === 0) {
      gameEnded = true
      alert("Congratulations! You win!")
    } else if (humanPieces === 0) {
      gameEnded = true
      alert("AI wins!")
    } else if (moveCount >= 50) {
      if (aiPieces === humanPieces) {
        gameEnded = true
        alert("Game over. It's a draw!")
      } else if (aiPieces > humanPieces) {
        gameEnded = true
        alert("AI wins!")
      } else {
        gameEnded = true
        alert("Congratulations! You win!")
      }
    }
  }

  restartButton.addEventListener("click", () => {
    moveHistory = []
    historyList.innerHTML = ""
    currentPlayer = "ai"
    moveCount = 0
    gameEnded = false
    initBoard()
    // Game will start after clicking PLAY

    // Restart background music
    if (!isMuted) {
      backgroundMusic.currentTime = 0
      backgroundMusic.play()
    }
  })

  muteButton.addEventListener("click", () => {
    isMuted = !isMuted
    if (isMuted) {
      muteIcon.src = "img2.png"
      backgroundMusic.pause()
    } else {
      muteIcon.src = "img1.png"
      backgroundMusic.play()
    }
  })

  // Event listener for the PLAY overlay
  playOverlay.addEventListener("click", () => {
    playOverlay.style.display = "none"
    gameStarted = true
    if (currentPlayer === "ai") {
      aiMove()
    } else {
      humanMove()
    }

    // Play background music when the game starts
    if (!isMuted) {
      backgroundMusic.play()
    }
  })

  initBoard()
  // Game will start after clicking PLAY
})
