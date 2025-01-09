document.addEventListener("DOMContentLoaded", () => {
  // get html elements
  const boardElement = document.getElementById("board")
  const historyList = document.getElementById("historyList")
  const difficultySelect = document.getElementById("difficulty")
  const restartButton = document.getElementById("restart")
  const muteButton = document.getElementById("muteButton")
  const muteIcon = document.getElementById("muteIcon")

  const openRulesButton = document.getElementById("openRulesButton")
  const rulesModal = document.getElementById("rulesModal")
  const closeRulesButton = document.getElementById("closeRulesButton")

  const playOverlay = document.getElementById("playOverlay")

  const moveLimitInput = document.getElementById("moveLimitInput")
  const setMoveLimitButton = document.getElementById("setMoveLimitButton")

  // open rules modal when user clicks RULES button
  openRulesButton.addEventListener("click", () => {
    rulesModal.style.display = "block"
  })

  // close rules modal when user clicks the close button
  closeRulesButton.addEventListener("click", () => {
    rulesModal.style.display = "none"
  })

  // if user clicks outside the rules modal close it
  window.addEventListener("click", (event) => {
    if (event.target == rulesModal) {
      rulesModal.style.display = "none"
    }
  })

  // sound control flag
  let isMuted = false

  // load sounds for background music and actions
  const backgroundMusic = new Audio("sound1.mp3")
  backgroundMusic.loop = true
  backgroundMusic.volume = 0.2
  backgroundMusic.playbackRate = 1.5
  const moveSound = new Audio("sound2.mp3")
  const captureSound = new Audio("sound3.mp3")
  const invalidMoveSound = new Audio("sound4.mp3")

  // game variables
  let board = []
  let moveHistory = []
  let currentPlayer = "ai" // the ai starts first
  let moveCount = 0
  let gameEnded = false
  let gameStarted = false

  // set default move limit
  let moveLimit = 50

  // directions for possible moves: up, right, down, left
  const directions = [
    { x: 0, y: -1 }, // up
    { x: 1, y: 0 }, // right
    { x: 0, y: 1 }, // down
    { x: -1, y: 0 }, // left
  ]

  // transposition table caching to avoid re-evaluating board states
  const transpositionTable = {}

  // function to hash the board for transposition caching
  // we build a simple string based on positions of pieces
  function hashBoard(boardState) {
    let hash = ""
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        let piece = boardState[y][x].piece
        hash += piece ? piece[0] : "_"
      }
    }
    return hash
  }

  // improved evaluation function with additional heuristics
  // more nuanced scoring (base points, center positioning, etc)
  function improvedEvaluateBoard(boardState) {
    let aiScore = 0;
    let humanScore = 0;
  
    //track how many pieces each side has 
    let aiPiecesCount = 0;       // count of AI (triangle) pieces
    let humanPiecesCount = 0;    // count of Human (circle) pieces
  
    // loop over all cells on the board
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        let cell = boardState[y][x];
        let piece = cell.piece;
  
        if (piece === "triangle") {
          // ----------------------
          // AI Piece (triangle)
          // ----------------------
  
          // (Existing) base value:
          aiScore += 20;
  
          // (Existing) small positional bonus for center proximity:
          let distCenter = Math.abs(x - 3) + Math.abs(y - 3);
          aiScore += (6 - distCenter);
  
          // count the piece for a final piece-advantage bonus
          aiPiecesCount++;
  
          // mobility bonus (count how many possible moves)
          let mobility = 0;
          for (let d of directions) {
            let nx = x + d.x;
            let ny = y + d.y;
            if (isValidCell(nx, ny)) {
              let neighbor = boardState[ny][nx].piece;
              // If neighbor is empty or an opponent piece, that’s a valid move
              if (neighbor === null || neighbor !== "triangle") {
                mobility++;
              }
            }
          }
          aiScore += mobility * 1;
  
          // threatened penalty (check if it's immediately capturable)
          let threatenedPenalty = 0;
          for (let d of directions) {
            let adjX = x + d.x;
            let adjY = y + d.y;
            if (isValidCell(adjX, adjY)) {
              let adjPiece = boardState[adjY][adjX].piece;
              // If adjacent is an opponent
              if (adjPiece && adjPiece !== "triangle") {
                let beyondX = adjX + d.x;
                let beyondY = adjY + d.y;
                if (isValidCell(beyondX, beyondY)) {
                  let beyondPiece = boardState[beyondY][beyondX].piece;
                  // If beyond is same type as adjPiece, capture is possible
                  if (beyondPiece === adjPiece) {
                    threatenedPenalty -= 10; // bigger penalty
                  }
                } else {
                  // If out-of-bounds might allow an "edge" capture
                  threatenedPenalty -= 5; // smaller penalty
                }
              }
            }
          }
          aiScore += threatenedPenalty;
  
          // synergy bonus (for pieces adjacent to friends)
          let synergyBonus = 0;
          for (let d of directions) {
            let friendX = x + d.x;
            let friendY = y + d.y;
            if (isValidCell(friendX, friendY)) {
              let friendPiece = boardState[friendY][friendX].piece;
              if (friendPiece === "triangle") {
                synergyBonus += 2; // small bonus for friendly neighbor
              }
            }
          }
          aiScore += synergyBonus;
  
        } else if (piece === "circle") {
  
          // base value:
          humanScore += 20;
  
          // small positional bonus for center proximity:
          let distCenter = Math.abs(x - 3) + Math.abs(y - 3);
          humanScore += (6 - distCenter);
  
          // count the piece for final piece-advantage bonus
          humanPiecesCount++;
  
          // mobility bonus
          let mobility = 0;
          for (let d of directions) {
            let nx = x + d.x;
            let ny = y + d.y;
            if (isValidCell(nx, ny)) {
              let neighbor = boardState[ny][nx].piece;
              // If neighbor is empty or an opponent piece
              if (neighbor === null || neighbor !== "circle") {
                mobility++;
              }
            }
          }
          humanScore += mobility * 1;
  
          // threatened penalty (if it's about to be captured)
          let threatenedPenalty = 0;
          for (let d of directions) {
            let adjX = x + d.x;
            let adjY = y + d.y;
            if (isValidCell(adjX, adjY)) {
              let adjPiece = boardState[adjY][adjX].piece;
              if (adjPiece && adjPiece !== "circle") {
                let beyondX = adjX + d.x;
                let beyondY = adjY + d.y;
                if (isValidCell(beyondX, beyondY)) {
                  let beyondPiece = boardState[beyondY][beyondX].piece;
                  if (beyondPiece === adjPiece) {
                    threatenedPenalty -= 10;
                  }
                } else {
                  threatenedPenalty -= 5;
                }
              }
            }
          }
          humanScore += threatenedPenalty;
  
          // synergy bonus (friendly pieces together)
          let synergyBonus = 0;
          for (let d of directions) {
            let friendX = x + d.x;
            let friendY = y + d.y;
            if (isValidCell(friendX, friendY)) {
              let friendPiece = boardState[friendY][friendX].piece;
              if (friendPiece === "circle") {
                synergyBonus += 2;
              }
            }
          }
          humanScore += synergyBonus;
        }
      }
    }
  
    // If AI is up by N pieces, that’s N * 50 points advantage
    aiScore += (aiPiecesCount - humanPiecesCount) * 50;
  
    // Return final difference from AI perspective
    return aiScore - humanScore;
  }

  // check if a cell is valid on the board
  function isValidCell(x, y) {
    return x >= 0 && x < 7 && y >= 0 && y < 7
  }

  // place the starting pieces for both ai and human
  function initPieces() {
    // ai pieces = triangle
    let aiPositions = [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 6, y: 4 },
      { x: 6, y: 6 },
    ]
    // human pieces = circle
    let humanPositions = [
      { x: 0, y: 6 },
      { x: 6, y: 0 },
      { x: 6, y: 2 },
      { x: 0, y: 4 },
    ]

    // place ai pieces on the board
    aiPositions.forEach((pos, index) => {
      placePiece(pos.x, pos.y, "triangle", `ai_${index}`)
    })

    // place human pieces on the board
    humanPositions.forEach((pos, index) => {
      placePiece(pos.x, pos.y, "circle", `human_${index}`)
    })
  }

  // function to initialize the board
  function initBoard() {
    board = []
    boardElement.innerHTML = ""

    // create a 7x7 board
    for (let y = 0; y < 7; y++) {
      let row = []
      for (let x = 0; x < 7; x++) {
        let cell = {
          x: x,
          y: y,
          piece: null, // no piece at start
        }

        // create cell element in html
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

    // place initial pieces
    initPieces()

    // show overlay to start the game
    playOverlay.style.display = "flex"
    gameStarted = false
  }

  // place a piece on the board at given x,y coordinates
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

  // remove a piece from a cell
  function removePiece(x, y) {
    let cell = board[y][x]
    cell.piece = null
    while (cell.element.firstChild) {
      cell.element.removeChild(cell.element.firstChild)
    }
  }

  // move a piece from one cell to another
  function movePiece(fromX, fromY, toX, toY) {
    let pieceType = board[fromY][fromX].piece
    let pieceElement = board[fromY][fromX].element.firstChild
    let pieceId = pieceElement ? pieceElement.dataset.id : null

    removePiece(fromX, fromY)
    placePiece(toX, toY, pieceType, pieceId)
    addMoveToHistory(pieceType, fromX, fromY, toX, toY)

    // play move sound if not muted
    if (!isMuted) {
      moveSound.play()
    }
  }

  // add move info to the history
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

    // remove "last-move" class from old last move
    const previousLastMove = historyList.querySelector(".last-move")
    if (previousLastMove) {
      previousLastMove.classList.remove("last-move")
    }

    let li = document.createElement("li")
    li.textContent = moveText

    // add class based on who moved
    if (pieceType === "triangle") {
      li.classList.add("ai-move")
    } else {
      li.classList.add("human-move")
    }

    li.classList.add("last-move")
    historyList.appendChild(li)
    historyList.scrollTop = historyList.scrollHeight
  }

  // get piece id at x,y
  function getPieceId(x, y) {
    let cell = board[y][x]
    if (cell.element.firstChild) {
      return cell.element.firstChild.dataset.id
    }
    return null
  }

  // get pieces belonging to a player
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

  // utility function to check if a move is a capture move for better move ordering
  // if the 'to' cell had an opponent piece. consider it a direct capture
  function isCaptureMove(boardState, move) {
    let fromPiece = boardState[move.from.y][move.from.x].piece
    let toPiece = boardState[move.to.y][move.to.x].piece
    if (toPiece && toPiece !== fromPiece) {
      return true
    }
    return false
  }

  // simulate a move on a given board state
  function makeMoveOnBoard(boardState, move) {
    // create a copy of the board
    let newBoard = boardState.map((row) => row.map((cell) => ({ ...cell })))
    let pieceType = newBoard[move.from.y][move.from.x].piece
    newBoard[move.from.y][move.from.x].piece = null
    newBoard[move.to.y][move.to.x].piece = pieceType

    // after moving, check captures on this simulated board
    newBoard = checkCapturesOnBoard(newBoard)
    return newBoard
  }

  // check captures on a simulated board state for minimax
  // same logic as checkCaptures but operates on a boardState object
  function checkCapturesOnBoard(boardState) {
    let toRemove = []

    // regular captures
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

    // horizontal special pattern = triangle, circle, circle, triangle
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
          toRemove.push({ x: x + 1, y: y })
          toRemove.push({ x: x + 2, y: y })
        }
      }
    }

    // vertical special pattern = triangle, circle, circle, triangle
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
          toRemove.push({ x: x, y: y + 1 })
          toRemove.push({ x: x, y: y + 2 })
        }
      }
    }

    // remove duplicates
    let uniqueToRemove = []
    toRemove.forEach((pos) => {
      if (!uniqueToRemove.some((p) => p.x === pos.x && p.y === pos.y)) {
        uniqueToRemove.push(pos)
      }
    })

    // remove captured pieces
    uniqueToRemove.forEach((pos) => {
      boardState[pos.y][pos.x].piece = null
    })

    return boardState
  }

  // check captures on the main 'board' real board in the DOM
  function checkCaptures() {
    let toRemove = []

    // regular captures
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

    // horizontal special pattern = triangle, circle, circle, triangle
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
          toRemove.push({ x: x + 1, y: y })
          toRemove.push({ x: x + 2, y: y })
        }
      }
    }

    // vertical special pattern = triangle, circle, circle, triangle
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
          toRemove.push({ x: x, y: y + 1 })
          toRemove.push({ x: x, y: y + 2 })
        }
      }
    }

    // remove duplicates
    let uniqueToRemove = []
    toRemove.forEach((pos) => {
      if (!uniqueToRemove.some((p) => p.x === pos.x && p.y === pos.y)) {
        uniqueToRemove.push(pos)
      }
    })

    // remove captured pieces
    uniqueToRemove.forEach((pos) => {
      removePiece(pos.x, pos.y)
    })

    // play capture sound if needed
    if (uniqueToRemove.length > 0 && !isMuted) {
      captureSound.play()
    }
  }

  // check if game is over
  function isGameOver(boardState) {
    let aiPieces = 0
    let humanPieces = 0

    boardState.forEach((row) => {
      row.forEach((cell) => {
        if (cell.piece === "triangle") aiPieces++
        if (cell.piece === "circle") humanPieces++
      })
    })

    // game is over if any side has 0 pieces or if reached moveLimit
    return aiPieces === 0 || humanPieces === 0 || moveCount >= moveLimit
  }

  // improved minimax using alpha-beta pruning + transposition table
  // incorporate caching, move ordering (captures first, enhanced eval, etc)
  function improvedMinimax(
    boardState,
    depth,
    alpha,
    beta,
    isMaximizing,
    movedPieces = []
  ) {
    // transposition table lookup
    let stateKey = hashBoard(boardState) + "_" + depth + "_" + isMaximizing
    if (transpositionTable[stateKey]) {
      return transpositionTable[stateKey]
    }

    // base condition
    if (depth === 0 || isGameOver(boardState)) {
      let evalScore = improvedEvaluateBoard(boardState)
      return { score: evalScore }
    }

    // get all possible moves for the current player
    let currentPieceType = isMaximizing ? "triangle" : "circle"
    let moves = getAllPossibleMoves(boardState, currentPieceType)

    // filter out moves for pieces that have already moved this turn
    moves = moves.filter(
      (move) => !movedPieces.includes(getPieceId(move.from.x, move.from.y))
    )

    // if no moves are available
    if (moves.length === 0) {
      let extreme = isMaximizing ? -Infinity : Infinity
      transpositionTable[stateKey] = { score: extreme }
      return transpositionTable[stateKey]
    }

    // move ordering: capture moves first
    moves.sort((a, b) => {
      let aIsCapture = isCaptureMove(boardState, a)
      let bIsCapture = isCaptureMove(boardState, b)
      // sort descending: 'true' moves to front
      return (bIsCapture ? 1 : 0) - (aIsCapture ? 1 : 0)
    })

    let bestMove = null

    if (isMaximizing) {
      let maxEval = -Infinity

      for (let move of moves) {
        let newBoard = makeMoveOnBoard(boardState, move)
        let pieceId = getPieceId(move.from.x, move.from.y)
        let newMovedPieces = [...movedPieces, pieceId]

        let result = improvedMinimax(
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
          break
        }
      }
      transpositionTable[stateKey] = { score: maxEval, move: bestMove }
      return transpositionTable[stateKey]
    } else {
      let minEval = Infinity

      for (let move of moves) {
        let newBoard = makeMoveOnBoard(boardState, move)
        let pieceId = getPieceId(move.from.x, move.from.y)
        let newMovedPieces = [...movedPieces, pieceId]

        let result = improvedMinimax(
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
          break
        }
      }
      transpositionTable[stateKey] = { score: minEval, move: bestMove }
      return transpositionTable[stateKey]
    }
  }

  // get all possible moves for a given piece type
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

  // iterative deepening search
  // call improvedMinimax repeatedly at increasing depths
  function iterativeDeepeningSearch(
    boardState,
    maxDepth,
    isMaximizing,
    movedPieces = []
  ) {
    let bestResult = null
    for (let d = 1; d <= maxDepth; d++) {
      let result = improvedMinimax(
        boardState,
        d,
        -Infinity,
        Infinity,
        isMaximizing,
        movedPieces
      )
      bestResult = result
    }
    return bestResult
  }

  // handle ai's turn
  function aiMove() {
    if (!gameStarted) return
    let aiPieces = getPlayerPieces("triangle")
    let movesNeeded = aiPieces.length > 1 ? 2 : 1
    let movesMade = 0
    let movedPieces = []

    function makeMove() {
      if (gameEnded || !gameStarted) return

      // use iterative deepening to get best move up to the selected difficulty (depth)
      let depth = parseInt(difficultySelect.value)
      let bestResult = iterativeDeepeningSearch(board, depth, true, movedPieces)
      let bestMove = bestResult.move

      if (bestMove) {
        let pieceId = getPieceId(bestMove.from.x, bestMove.from.y)

        // if that piece moved already this turn, try another if possible
        if (movedPieces.includes(pieceId)) {
          let alternativeMoves = getAllPossibleMoves(board, "triangle").filter(
            (m) => !movedPieces.includes(getPieceId(m.from.x, m.from.y))
          )
          if (alternativeMoves.length > 0) {
            bestMove = alternativeMoves[0]
          } else {
            currentPlayer = "human"
            humanMove()
            return
          }
        }

        // execute best move
        movePiece(
          bestMove.from.x,
          bestMove.from.y,
          bestMove.to.x,
          bestMove.to.y
        )
        movedPieces.push(pieceId)
        checkCaptures()
        moveCount++
        checkGameEnd()
        if (gameEnded) return
        movesMade++

        // if ai needs to move again
        if (movesMade < movesNeeded) {
          setTimeout(makeMove, 500)
        } else {
          currentPlayer = "human"
          humanMove()
        }
      } else {
        // no move found, ai loses
        gameEnded = true
        alert("AI cannot move. You win!")
      }
    }

    // small delay for ai thinking :))
    setTimeout(makeMove, 500)
  }

  // handle human's turn
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
          // if same piece clicked again, deselect
          deselectPiece()
        } else if (!movedPieces.includes(pieceId)) {
          // select a new piece if it hasn't moved this turn
          deselectPiece()
          selectedPiece = { x: x, y: y, id: pieceId }
          if (pieceElement) {
            pieceElement.classList.add("selected")
          }
          availableMoves = getAvailableMoves(x, y)
          highlightAvailableMoves()
        } else {
          // can't move the same piece twice in one turn
          if (!isMuted) {
            invalidMoveSound.play()
          }
          alert("You cannot move the same piece twice in a single turn.")
        }
      } else if (
        selectedPiece &&
        cell.element.classList.contains("available")
      ) {
        // move piece
        movePiece(selectedPiece.x, selectedPiece.y, x, y)
        movedPieces.push(selectedPiece.id)
        deselectPiece()
        checkCaptures()
        moveCount++
        humanMovesMade++
        checkGameEnd()
        if (gameEnded) return

        // if human has more than one piece, needs 2 moves; otherwise 1
        let humanPieces = getPlayerPieces("circle")
        let movesNeeded = humanPieces.length > 1 ? 2 : 1
        if (humanMovesMade >= movesNeeded) {
          currentPlayer = "ai"
          detachEventListeners()
          aiMove()
        } else {
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

  // check end conditions after every move
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
    } else if (moveCount >= moveLimit) {
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

  // restart button: reset everything and start new game
  restartButton.addEventListener("click", () => {
    moveHistory = []
    historyList.innerHTML = ""
    currentPlayer = "ai"
    moveCount = 0
    gameEnded = false

    // clear transposition table if you want a fresh search cache
    for (let key in transpositionTable) {
      delete transpositionTable[key]
    }

    // reset move limit to current input value if needed
    moveLimit = parseInt(moveLimitInput.value) || 50
    initBoard()

    // replay music if not muted
    if (!isMuted) {
      backgroundMusic.currentTime = 0
      backgroundMusic.play()
    }
  })

  // mute/unmute the sounds
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

  // set move limit without restarting the game
  setMoveLimitButton.addEventListener("click", () => {
    let newLimit = parseInt(moveLimitInput.value)
    if (newLimit > 0) {
      moveLimit = newLimit
      alert("Move limit set to " + moveLimit)
      checkGameEnd()
    } else {
      alert("Please enter a valid positive number for move limit.")
    }
  })

  // when player clicks on the overlay, start the game
  playOverlay.addEventListener("click", () => {
    playOverlay.style.display = "none"
    gameStarted = true
    if (currentPlayer === "ai") {
      aiMove()
    } else {
      humanMove()
    }

    // play background music if not muted
    if (!isMuted) {
      backgroundMusic.play()
    }
  })

  // start board at page load
  initBoard()
})
