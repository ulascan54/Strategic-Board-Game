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

  // Ses dosyaları
  const backgroundMusic = new Audio("sound1.mp3")
  backgroundMusic.loop = true
  backgroundMusic.volume = 0.01
  const moveSound = new Audio("sound2.mp3")
  const captureSound = new Audio("sound3.mp3")
  const invalidMoveSound = new Audio("sound4.mp3")

  let board = []
  let moveHistory = []
  let currentPlayer = "human" // 'human' veya 'ai'
  let moveCount = 0
  let gameEnded = false

  const directions = [
    { x: 0, y: -1 }, // Yukarı
    { x: 1, y: 0 }, // Sağ
    { x: 0, y: 1 }, // Aşağı
    { x: -1, y: 0 }, // Sol
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
          piece: null, // 'triangle', 'circle' veya null
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
  }

  function initPieces() {
    // Taşların başlangıç konumları
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

    // Taş hareket ettiğinde moveSound çal
    if (!isMuted) {
      moveSound.play()
    }
  }

  function addMoveToHistory(pieceType, fromX, fromY, toX, toY) {
    moveHistory.push({
      player: pieceType === "triangle" ? "AI" : "İnsan",
      pieceType: pieceType,
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY },
    })
    let moveText = `${moveHistory.length}. ${
      pieceType === "triangle" ? "AI" : "İnsan"
    } (${fromX},${fromY}) konumundan (${toX},${toY}) konumuna hareket etti`

    // Önceki son hamleden 'last-move' sınıfını kaldır
    const previousLastMove = historyList.querySelector(".last-move")
    if (previousLastMove) {
      previousLastMove.classList.remove("last-move")
    }

    let li = document.createElement("li")
    li.textContent = moveText

    // Hamleyi yapan oyuncuya göre CSS sınıfı ekle
    if (pieceType === "triangle") {
      li.classList.add("ai-move")
    } else {
      li.classList.add("human-move")
    }

    // Son hamleyi vurgulamak için 'last-move' sınıfını ekle
    li.classList.add("last-move")

    historyList.appendChild(li)

    // Hamle geçmişi bölümünü en alta kaydır
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
      if (gameEnded) return
      let x = parseInt(event.currentTarget.dataset.x)
      let y = parseInt(event.currentTarget.dataset.y)
      let cell = board[y][x]

      if (cell.piece === "circle") {
        let pieceElement = cell.element.firstChild
        let pieceId = pieceElement.dataset.id

        if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
          // Aynı parçaya tekrar tıklanırsa seçim kaldırılır
          deselectPiece()
        } else if (!movedPieces.includes(pieceId)) {
          // Yeni bir parça seçilir
          deselectPiece()
          selectedPiece = { x: x, y: y, id: pieceId }
          if (pieceElement) {
            pieceElement.classList.add("selected")
          }
          availableMoves = getAvailableMoves(x, y)
          highlightAvailableMoves()
        } else {
          // Bu parça bu turda zaten hareket etti
          if (!isMuted) {
            invalidMoveSound.play()
          }
          alert("Aynı taşı aynı turda iki kez hareket ettiremezsiniz.")
        }
      } else if (
        selectedPiece &&
        cell.element.classList.contains("available")
      ) {
        // Seçilen parça hareket ettirilir
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
          // Seçimi sıfırlayarak oyuncunun başka bir parça seçmesine izin ver
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
    let aiPieces = getPlayerPieces("triangle")
    let movesNeeded = aiPieces.length > 1 ? 2 : 1
    let movesMade = 0
    let movedPieces = []

    function makeMove() {
      if (gameEnded) return
      let bestMove = minimax(
        board,
        parseInt(difficultySelect.value),
        -Infinity,
        Infinity,
        true,
        movedPieces
      )
      if (bestMove && bestMove.move) {
        // AI'nin farklı parçaları hareket ettirmesini sağlar
        let pieceId = getPieceId(bestMove.move.from.x, bestMove.move.from.y)
        if (movedPieces.includes(pieceId)) {
          // Başka bir parça ile alternatif bir hareket bulun
          let alternativeMoves = getAllPossibleMoves(board, "triangle").filter(
            (move) =>
              !movedPieces.includes(getPieceId(move.from.x, move.from.y))
          )
          if (alternativeMoves.length > 0) {
            bestMove.move = alternativeMoves[0]
          } else {
            // Başka hareket yok, bu turda daha fazla hamle yapamaz
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
          setTimeout(makeMove, 500) // AI hamleleri arasında kısa bir bekleme
        } else {
          currentPlayer = "human"
          humanMove()
        }
      } else {
        gameEnded = true
        alert("AI hareket edemiyor. Kazandınız!")
      }
    }

    setTimeout(makeMove, 500) // AI hamlesini kısa bir gecikmeden sonra başlat
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

    // Mevcut yakalama mantığı
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

    // Yeni yakalama mantığı: CTTC ve TCCT dizilimlerini kontrol et
    // Yatay kontrol
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
          // Aradaki iki taşı kaldır
          toRemove.push({ x: x + 1, y: y })
          toRemove.push({ x: x + 2, y: y })
        }
      }
    }

    // Dikey kontrol
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
          // Aradaki iki taşı kaldır
          toRemove.push({ x: x, y: y + 1 })
          toRemove.push({ x: x, y: y + 2 })
        }
      }
    }

    // Aynı taşı birden fazla kez kaldırmamak için benzersiz pozisyonları filtrele
    let uniqueToRemove = []
    toRemove.forEach((pos) => {
      if (!uniqueToRemove.some((p) => p.x === pos.x && p.y === pos.y)) {
        uniqueToRemove.push(pos)
      }
    })

    // Yakalanan parçaları kaldır
    uniqueToRemove.forEach((pos) => {
      removePiece(pos.x, pos.y)
    })

    // Eğer taşlar yakalandıysa captureSound çal
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
    let score = 10 // Her taşın temel değeri
    let opponentType = pieceType === "triangle" ? "circle" : "triangle"

    // Taşın etrafındaki hücreleri kontrol et
    directions.forEach((dir) => {
      let x = cell.x + dir.x
      let y = cell.y + dir.y
      if (isValidCell(x, y)) {
        let neighbor = boardState[y][x]
        if (neighbor.piece === opponentType) {
          // Rakip taş yanındaysa, risk altında
          score -= 2
        } else if (neighbor.piece === pieceType) {
          // Kendi taşımız yanındaysa, daha güvenli
          score += 1
        }
      } else {
        // Kenardaki taşlar daha riskli olabilir
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

    // Filtreleme: Aynı taşı iki kez hareket ettirmeyelim
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
          break // Beta kesmesi
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
          break // Alfa kesmesi
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

    // Hamleden sonra yakalamaları kontrol et
    newBoard = checkCapturesOnBoard(newBoard)
    return newBoard
  }

  function checkCapturesOnBoard(boardState) {
    let toRemove = []

    // Mevcut yakalama mantığı
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

    // Yeni yakalama mantığı: CTTC ve TCCT dizilimlerini kontrol et
    // Yatay kontrol
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
          // Aradaki iki taşı kaldır
          toRemove.push({ x: x + 1, y: y })
          toRemove.push({ x: x + 2, y: y })
        }
      }
    }

    // Dikey kontrol
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
          // Aradaki iki taşı kaldır
          toRemove.push({ x: x, y: y + 1 })
          toRemove.push({ x: x, y: y + 2 })
        }
      }
    }

    // Aynı taşı birden fazla kez kaldırmamak için benzersiz pozisyonları filtrele
    let uniqueToRemove = []
    toRemove.forEach((pos) => {
      if (!uniqueToRemove.some((p) => p.x === pos.x && p.y === pos.y)) {
        uniqueToRemove.push(pos)
      }
    })

    // Yakalanan parçaları kaldır
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
      alert("Oyun bitti. Berabere!")
    } else if (aiPieces === 0) {
      gameEnded = true
      alert("Tebrikler! Kazandınız!")
    } else if (humanPieces === 0) {
      gameEnded = true
      alert("AI kazandı!")
    } else if (moveCount >= 50) {
      if (aiPieces === humanPieces) {
        gameEnded = true
        alert("Oyun bitti. Berabere!")
      } else if (aiPieces > humanPieces) {
        gameEnded = true
        alert("AI kazandı!")
      } else {
        gameEnded = true
        alert("Tebrikler! Kazandınız!")
      }
    }
  }

  restartButton.addEventListener("click", () => {
    moveHistory = []
    historyList.innerHTML = ""
    currentPlayer = "human"
    moveCount = 0
    gameEnded = false
    initBoard()
    humanMove()

    // Arka plan müziğini yeniden başlat
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

  initBoard()
  humanMove()

  // Oyun başladığında arka plan müziğini çal
  if (!isMuted) {
    backgroundMusic.play()
  }
})
