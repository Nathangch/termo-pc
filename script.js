// --- Configuração e Dados (Carregados via words.js) ---
const WORDS = typeof WORDS_DATA !== 'undefined' ? WORDS_DATA : [];

function normalizeWord(word) {
    return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

/**
 * Classe que gerencia um único tabuleiro (Board).
 * Pode haver 1, 2 ou 4 instâncias dessa classe ativas.
 */
class Board {
    constructor(id, totalRows, secretWord) {
        this.id = id;
        this.ROWS = totalRows;
        this.COLS = 5;
        this.secretWord = secretWord;
        this.gridState = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(""));
        this.currentRow = 0;
        this.isSolved = false;
        this.isFailed = false;
        this.element = null; // Referência ao DOM
    }

    // Cria o HTML do tabuleiro
    render(container) {
        this.element = document.createElement('div');
        this.element.id = `board-${this.id}`;
        this.element.className = 'board';
        this.element.style.setProperty('--rows', this.ROWS);

        for (let r = 0; r < this.ROWS; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            for (let c = 0; c < this.COLS; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.id = `tile-${this.id}-${r}-${c}`;
                // Click handler removido aqui para ser gerenciado pelo Game controller centralmente se necessário
                // ou apenas visual. O clique foca "globalmente" na linha atual.
                tile.addEventListener('click', () => game.handleTileClick(this.id, r, c));
                rowDiv.appendChild(tile);
            }
            this.element.appendChild(rowDiv);
        }
        container.appendChild(this.element);
    }

    addLetter(letter, col) {
        if (this.isSolved || this.isFailed) return; // Tabuleiro congelado

        this.gridState[this.currentRow][col] = letter;
        const tile = document.getElementById(`tile-${this.id}-${this.currentRow}-${col}`);
        if (tile) {
            tile.textContent = letter;
            tile.classList.remove('pop');
            void tile.offsetWidth;
            tile.classList.add('pop');
            tile.setAttribute('data-status', 'tbd');
        }
    }

    removeLetter(col) {
        if (this.isSolved || this.isFailed) return;

        this.gridState[this.currentRow][col] = "";
        const tile = document.getElementById(`tile-${this.id}-${this.currentRow}-${col}`);
        if (tile) {
            tile.textContent = "";
            tile.removeAttribute('data-status');
        }
    }

    // Retorna o resultado da avaliação dessa linha
    checkRow(wordGuess) {
        if (this.isSolved || this.isFailed) return null; // Não processa

        const secretChars = this.secretWord.split("");
        const guessChars = wordGuess.split("");
        const results = Array(this.COLS).fill("absent");
        const secretLettersCount = {};

        secretChars.forEach(char => secretLettersCount[char] = (secretLettersCount[char] || 0) + 1);

        // 1. Greens
        guessChars.forEach((char, i) => {
            if (char === secretChars[i]) {
                results[i] = "correct";
                secretLettersCount[char]--;
            }
        });
        // 2. Yellows
        guessChars.forEach((char, i) => {
            if (results[i] !== "correct" && secretLettersCount[char] > 0) {
                results[i] = "present";
                secretLettersCount[char]--;
            }
        });

        // Aplica visual
        const rowToUpdate = this.currentRow;
        guessChars.forEach((char, i) => {
            setTimeout(() => {
                const tile = document.getElementById(`tile-${this.id}-${rowToUpdate}-${i}`);
                if (tile) {
                    tile.classList.add('flip', results[i]);
                    tile.removeAttribute('data-status');
                }
            }, i * 250);
        });

        return results;
    }

    finalizeRow(wordGuess) {
        if (this.isSolved || this.isFailed) return;

        if (wordGuess === this.secretWord) {
            this.isSolved = true;
            setTimeout(() => this.element.classList.add('solved'), 1500);
        } else if (this.currentRow === this.ROWS - 1) {
            this.isFailed = true;
            this.element.classList.add('failed'); // Visual opcional
        } else {
            this.currentRow++;
        }
    }

    updateFocus(col, isGameActive) {
        // Limpa foco anterior deste board
        const tiles = this.element.querySelectorAll('.tile');
        tiles.forEach(t => t.classList.remove('active-focus'));

        if (!isGameActive || this.isSolved || this.isFailed) return;

        const tile = document.getElementById(`tile-${this.id}-${this.currentRow}-${col}`);
        if (tile) tile.classList.add('active-focus');
    }
}


/**
 * Classe principal do Jogo com suporte a múltiplos modos.
 */
class Game {
    constructor() {
        this.mode = 1; // 1, 2, 4, 'crossword'
        this.maxAttempts = 6;
        this.boards = [];
        this.currentCol = 0;
        this.isGameOver = false;
        this.stats = this.loadStats();

        // Crossword specific state
        this.cwGrid = null; // { words, rows, cols }
        this.cwState = {}; // Key: "r,c", Value: { char: "", type: "empty"|"correct"|"present"|"absent" }
        this.cwActiveWordIndex = -1; // Index in cwGrid.words

        // Elementos UI
        this.boardsContainer = document.getElementById('boards-container');
        this.keyboardContainer = document.getElementById('keyboard');

        // Inicializa listeners
        this.initListeners();

        // Inicia modo padrão
        this.setMode(1);
    }

    loadStats() {
        const defaultStats = {
            1: { played: 0, won: 0, streak: 0, maxStreak: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, fail: 0 } },
            2: { played: 0, won: 0, streak: 0, maxStreak: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, fail: 0 } },
            4: { played: 0, won: 0, streak: 0, maxStreak: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, fail: 0 } },
            'crossword': { played: 0, won: 0 } // Simple stats for CW
        };
        const stored = localStorage.getItem('termoMultiStats');
        return stored ? { ...defaultStats, ...JSON.parse(stored) } : defaultStats;
    }

    saveStats() {
        localStorage.setItem('termoMultiStats', JSON.stringify(this.stats));
    }

    setMode(n) {
        // Toggle de Interface:
        // Se n === 'crossword', esconde o toggle do header.
        // Se n === 1, 2, 4, mostra o toggle.
        // Se o usuario selecionar '1' (Termo) vindo do Crossword, ele deve restaurar o modo anterior ou default (1).

        const headerLeft = document.querySelector('.header-left');
        const modeToggle = document.getElementById('mode-toggle');

        if (n === 'crossword') {
            this.mode = 'crossword';
            if (headerLeft) headerLeft.style.visibility = 'hidden'; // Hide the Termo toggle
        } else {
            this.mode = parseInt(n);
            if (headerLeft) headerLeft.style.visibility = 'visible'; // Show the Termo toggle

            // Update UI Botoes do Header (Termo/Dueto/Quarteto)
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.mode) === this.mode);
            });

            // Update Label Headers
            const labels = { 1: 'TERMO', 2: 'DUETO', 4: 'QUARTETO' };
            const labelEl = document.getElementById('current-mode-label');
            if (labelEl) labelEl.textContent = labels[this.mode] || 'TERMO';

            this.maxAttempts = this.mode === 1 ? 6 : (this.mode === 2 ? 7 : 9);
        }

        // Close Bottom Menu implicitly
        const gamesModal = document.getElementById('games-modal');
        if (!gamesModal.classList.contains('hidden')) {
            gamesModal.classList.add('hidden');
            document.getElementById('modal-overlay').classList.add('hidden');
        }

        this.startNewGame();
    }

    startNewGame() {
        // Limpar sessões anteriores
        this.boardsContainer.innerHTML = '';
        this.boards = [];
        this.currentCol = 0;
        this.isGameOver = false;

        // Clear keyboard colors
        document.querySelectorAll('.key').forEach(k => {
            k.className = 'key';
            if (k.textContent === 'ENTER' || k.textContent === '⌫') k.classList.add('wide');
        });

        // Clear Crossword Controls if any
        const cwControls = document.getElementById('cw-floating-controls');
        if (cwControls) cwControls.innerHTML = '';

        // Manage Termo Selector Visibility & Label
        const termoSelector = document.getElementById('termo-selector');
        if (this.mode === 'crossword') {
            if (termoSelector) termoSelector.classList.add('hidden');
            this.startCrossword();
            return;
        } else {
            if (termoSelector) {
                termoSelector.classList.remove('hidden');

                // Update Label Text
                const currentLabel = document.getElementById('current-termo-mode');
                const labels = { 1: 'TERMO', 2: 'DUETO', 4: 'QUARTETO' };
                if (currentLabel) {
                    currentLabel.innerHTML = `${labels[this.mode]} <span class="arrow">▼</span>`;
                }
            }
        }

        // Ajusta classes de CSS container
        this.boardsContainer.className = `boards-${this.mode}`;

        // Cria boards
        for (let i = 0; i < this.mode; i++) {
            const secret = normalizeWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
            console.log(`Board ${i} Secret:`, secret);
            const board = new Board(i, this.maxAttempts, secret);
            board.render(this.boardsContainer);
            this.boards.push(board);
        }

        this.createKeyboard();
        this.updateFocus();
        this.startCountdown();
    }


    renderCrossword() {
        const wrapper = document.createElement('div');
        wrapper.className = 'crossword-container';

        // --- Grid ---
        const gridEl = document.createElement('div');
        gridEl.className = 'crossword-grid';
        gridEl.style.gridTemplateColumns = `repeat(${this.cwGrid.cols}, 1fr)`;
        gridEl.style.gridTemplateRows = `repeat(${this.cwGrid.rows}, 1fr)`;
        // Width is handled by CSS (max-content) now to respect padding

        this.cwGrid.element = gridEl;

        // Render cells
        for (let r = 0; r < this.cwGrid.rows; r++) {
            for (let c = 0; c < this.cwGrid.cols; c++) {
                const cellKey = `${r},${c}`;
                const cellState = this.cwState[cellKey];

                const cellDiv = document.createElement('div');
                cellDiv.className = 'cw-cell';
                cellDiv.dataset.r = r;
                cellDiv.dataset.c = c;

                if (cellState) {
                    cellDiv.classList.add('active-word');
                    cellDiv.textContent = cellState.char;
                    if (cellState.type !== 'empty') cellDiv.classList.add(cellState.type);

                    // Add click handler
                    cellDiv.addEventListener('click', () => this.handleCrosswordClick(r, c));

                    // Add Word Number indicator if start of word
                    // Important: One cell can be start of TWO words (Across and Down).
                    // We need to check all words starting here.
                    const startWords = this.cwGrid.words.filter(w => w.row === r && w.col === c);
                    if (startWords.length > 0) {
                        const num = document.createElement('span');
                        num.className = 'cw-num';
                        // Show number of the *first* word starting here (usually shared start words match ID, or we pick smallest)
                        // For simplicity, showing the Across ID if present, else Down ID.
                        // Actually, sorting by ID to startWords ensures consistent numbering?
                        // Let's just use startWords[0].id + 1
                        num.textContent = startWords[0].id + 1;
                        cellDiv.appendChild(num);
                    }
                }

                gridEl.appendChild(cellDiv);
            }
        }

        wrapper.appendChild(gridEl);

        // --- Right Column (Hints + Button) ---
        const rightCol = document.createElement('div');
        rightCol.className = 'cw-right-col';

        // --- Hints Panel ---
        const hintsPanel = document.createElement('div');
        hintsPanel.className = 'cw-hints-panel';

        const acrossSection = document.createElement('div');
        acrossSection.className = 'hints-section';
        acrossSection.innerHTML = `<h3>Horizontais</h3>`;

        const downSection = document.createElement('div');
        downSection.className = 'hints-section';
        downSection.innerHTML = `<h3>Verticais</h3>`;

        // Sort words by ID/Number for easier reading? Or separating Across/Down.
        const acrossWords = this.cwGrid.words.filter(w => w.dir === 'across').sort((a, b) => a.id - b.id);
        const downWords = this.cwGrid.words.filter(w => w.dir === 'down').sort((a, b) => a.id - b.id);

        const createHintItem = (w) => {
            const item = document.createElement('div');
            item.className = 'hint-item';
            item.dataset.id = w.id;

            // Format: "1. Pergunta aqui (5)"
            // Ensure w.clue is a string
            let text = w.clue ? w.clue : "Dica indisponível";
            // Check if length is already in clue (avoid double parens if data has it)
            if (!text.includes('(')) {
                text += ` (${w.word.length})`;
            }

            item.innerHTML = `<span class="hint-num">${w.id + 1}</span><span class="hint-text">${text}</span>`;
            item.addEventListener('click', () => this.selectCrosswordWord(this.cwGrid.words.indexOf(w)));
            return item;
        };

        acrossWords.forEach(w => acrossSection.appendChild(createHintItem(w)));
        downWords.forEach(w => downSection.appendChild(createHintItem(w)));

        hintsPanel.appendChild(acrossSection);
        hintsPanel.appendChild(downSection);
        this.cwHintsPanel = hintsPanel; // Save ref

        rightCol.appendChild(hintsPanel);

        rightCol.appendChild(hintsPanel);

        // --- Finish Button (Floating) ---
        const controlsContainer = document.getElementById('cw-floating-controls');
        if (controlsContainer) {
            controlsContainer.innerHTML = ''; // Clear previous
            const finishBtn = document.createElement('button');
            finishBtn.className = 'cw-finish-btn';
            finishBtn.innerHTML = '✔';
            finishBtn.title = "Finalizar";
            finishBtn.addEventListener('click', () => this.validateCrossword());
            controlsContainer.appendChild(finishBtn);
        }

        wrapper.appendChild(rightCol);

        this.boardsContainer.appendChild(wrapper);
    }

    validateCrossword() {
        if (this.isGameOver) return;

        const correctCells = new Set();
        const wrongCells = new Set();

        // 1. Analyze each word
        this.cwGrid.words.forEach(w => {
            let isCorrect = true;
            let cells = [];

            for (let i = 0; i < w.word.length; i++) {
                const cr = w.dir === 'down' ? w.row + i : w.row;
                const cc = w.dir === 'down' ? w.col : w.col + i;
                const cellKey = `${cr},${cc}`;
                const state = this.cwState[cellKey];

                cells.push(cellKey);

                if (state.char !== w.word[i]) {
                    isCorrect = false;
                }
            }

            if (isCorrect) {
                cells.forEach(k => correctCells.add(k));
            } else {
                cells.forEach(k => wrongCells.add(k));
            }
        });

        // 2. Update Grid UI
        // Priorities: Correct (Green) > Wrong (Red)
        // If a cell is in both (intersection of correct word and wrong word), it is Correct (Green).
        // If a cell is only in Wrong, it is Red.

        document.querySelectorAll('.cw-cell').forEach(el => {
            const r = parseInt(el.dataset.r);
            const c = parseInt(el.dataset.c);
            const key = `${r},${c}`;

            if (correctCells.has(key)) {
                el.classList.add('correct');
                el.classList.remove('active-word', 'highlight'); // Remove focus styles
            } else if (wrongCells.has(key)) {
                el.classList.add('absent'); // Red
                el.classList.remove('active-word', 'highlight');
            }
        });

        // 3. Block Game
        this.isGameOver = true;

        // 4. Feedback
        // Check if fully correct?
        if (wrongCells.size === 0 && correctCells.size > 0) {
            showMessage("Parabéns! Você completou as palavras cruzadas!");
            // Update stats logic here if needed
        } else {
            showMessage("Jogo finalizado. Verifique os erros em vermelho.");
        }
    }


    initListeners() {
        document.addEventListener('keydown', (e) => this.handlePhysicalKeyboard(e));

        // Toggle Menu
        const toggleBtn = document.getElementById('mode-toggle');
        const menu = document.getElementById('mode-menu'); // O menu antigo (do cabeçalho)

        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
                toggleBtn.classList.toggle('open');
            });
        }

        // Main Menu Button (New)
        const mainMenuBtn = document.getElementById('main-menu-btn');
        const gamesModal = document.getElementById('games-modal');
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => {
                gamesModal.classList.remove('hidden');
                document.getElementById('modal-overlay').classList.remove('hidden');
            });
        }

        // Termo Dropdown Toggle
        const dropdownBtn = document.getElementById('current-termo-mode');
        const dropdownContent = document.getElementById('termo-options');

        if (dropdownBtn && dropdownContent) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('hidden');
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                    dropdownContent.classList.add('hidden');
                }
            });
        }

        // Termo Sub-Mode Buttons
        document.querySelectorAll('.sub-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = parseInt(btn.dataset.mode);
                if (dropdownContent) dropdownContent.classList.add('hidden'); // Close menu
                if (this.mode !== mode) {
                    this.setMode(mode);
                }
            });
        });

        // Game Mode Options
        document.querySelectorAll('.game-mode-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                gamesModal.classList.add('hidden');
                document.getElementById('modal-overlay').classList.add('hidden');
                this.setMode(mode === 'crossword' ? 'crossword' : parseInt(mode));
            });
        });

        // Close menu/modals logic
        document.addEventListener('click', (e) => {
            // ... existing logic ...
        });

        document.getElementById('help-btn').addEventListener('click', () => openModal('help-modal'));
        document.getElementById('stats-btn').addEventListener('click', () => {
            this.renderStats();
            openModal('stats-modal');
        });
        document.getElementById('share-btn').addEventListener('click', () => this.shareResult());
        document.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', closeModal));
        document.getElementById('modal-overlay').addEventListener('click', closeModal);
    }

    handlePhysicalKeyboard(e) {
        if (this.isGameOver) return;
        if (!document.getElementById('modal-overlay').classList.contains('hidden')) {
            if (e.key === 'Escape') closeModal();
            return;
        }

        const key = e.key;
        if (this.mode === 'crossword') {
            // Navigation Keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                e.preventDefault();
                this.handleCrosswordNavigation(key);
                return;
            }
            if (key === 'Tab') {
                e.preventDefault();
                this.cwDirection = this.cwDirection === 'across' ? 'down' : 'across';
                this.updateCrosswordFocus();
                return;
            }
            this.handleCrosswordInput(key);
            return;
        }

        if (key === 'Enter') this.submitGuess();
        else if (key === 'Backspace') this.deleteLetter();
        else if (/^[a-zA-Z]$/.test(key)) this.addLetter(key.toUpperCase());
        else if (key === 'ArrowLeft') {
            if (this.currentCol > 0) { this.currentCol--; this.updateFocus(); }
        } else if (key === 'ArrowRight') {
            if (this.currentCol < 5 - 1) { this.currentCol++; this.updateFocus(); }
        }
    }

    handleVirtualKey(key) {
        if (this.isGameOver) return;

        if (this.mode === 'crossword') {
            if (key === 'ENTER') this.submitGuessCrossword(); // Optional: Check win or just visual?
            else if (key === '⌫') this.handleCrosswordInput('Backspace');
            else this.handleCrosswordInput(key);
            return;
        }

        if (key === 'ENTER') this.submitGuess();
        else if (key === '⌫') this.deleteLetter();
        else this.addLetter(key);
    }

    handleCrosswordNavigation(key) {
        let dr = 0, dc = 0;
        if (key === 'ArrowUp') dr = -1;
        if (key === 'ArrowDown') dr = 1;
        if (key === 'ArrowLeft') dc = -1;
        if (key === 'ArrowRight') dc = 1;

        // Try move
        const nr = this.cwCursor.r + dr;
        const nc = this.cwCursor.c + dc;

        // Check if target is valid cell
        if (this.cwState[`${nr},${nc}`]) {
            this.cwCursor = { r: nr, c: nc };
            this.updateCrosswordFocus();
        }
    }

    handleCrosswordInput(key) {
        if (this.isGameOver) return;

        if (key === 'Backspace') {
            // If current cell is empty, move back then clear. 
            // If current cell has char, clear it, don't move? 
            // Standard behavior: Clear current. If empty, move back and clear.

            const cellKey = `${this.cwCursor.r},${this.cwCursor.c}`;
            const currentState = this.cwState[cellKey];

            if (currentState.char === '') {
                // Move back
                this.moveCursorBack();
                // Clear new pos
                const newKey = `${this.cwCursor.r},${this.cwCursor.c}`;
                this.cwState[newKey].char = '';
            } else {
                currentState.char = '';
                // Optional: Move back after deleting? Usually no, unless it was a typo correction flow.
                // Request says "apagar a letra atual e mover para a célula anterior".
                this.moveCursorBack();
            }

            this.updateCrosswordTiles(); // Updates visual grid
            return;
        }

        if (/^[a-zA-Z]$/.test(key)) {
            const letter = key.toUpperCase();
            const cellKey = `${this.cwCursor.r},${this.cwCursor.c}`;

            if (this.cwState[cellKey]) {
                this.cwState[cellKey].char = letter;
                this.updateCrosswordTiles();
                // Check continuously?
                this.checkCrosswordWin();

                // Move forward to the next cell
                this.moveCursorForward();
            }
        }
    }

    moveCursorForward() {
        const dr = this.cwDirection === 'across' ? 0 : 1;
        const dc = this.cwDirection === 'across' ? 1 : 0;
        const nr = this.cwCursor.r + dr;
        const nc = this.cwCursor.c + dc;

        if (this.cwState[`${nr},${nc}`]) {
            this.cwCursor = { r: nr, c: nc };
            this.updateCrosswordFocus();
        }
    }

    moveCursorBack() {
        const dr = this.cwDirection === 'across' ? 0 : -1;
        const dc = this.cwDirection === 'across' ? -1 : 0;
        const nr = this.cwCursor.r + dr;
        const nc = this.cwCursor.c + dc;

        if (this.cwState[`${nr},${nc}`]) {
            this.cwCursor = { r: nr, c: nc };
            this.updateCrosswordFocus();
        }
    }

    updateCrosswordTiles() {
        // Redraw content only
        for (const [key, state] of Object.entries(this.cwState)) {
            const [r, c] = key.split(',').map(Number);
            const cellIndex = r * this.cwGrid.cols + c;
            const cellDiv = this.cwGrid.element.children[cellIndex];
            // Preserves numbers and styling, just updates text
            // But text is a child textNode or simple content? 
            // cellDiv.textContent clears children (the number spans).
            // We need to update just the text node.

            // Simple hack: Re-render innerHTML or find text node?
            // Let's protect the span .cw-num
            const numSpan = cellDiv.querySelector('.cw-num');
            cellDiv.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
            });

            if (state.char) {
                cellDiv.appendChild(document.createTextNode(state.char));
            }

            // Update logic classes (correct/present/absent) - REMOVE them for editing?
            // Or keep them until submit? 
            // Crosswords usually Instant Feedback or Check Button. 
            // Original code had submitGuessCrossword.
            // Let's keep dynamic feedback if it was there, or clear it if editing.
            // For now, assume simple editing.
            cellDiv.classList.remove('correct', 'present', 'absent');
            if (state.type !== 'empty') cellDiv.classList.add(state.type);
        }
        this.updateKeyboardColorsCrossword([], []); // Pass empty to avoid errors or logic to update correctly
    }

    submitGuessCrossword() {

        // Greens
        guessArr.forEach((char, i) => {
            if (char === w.word[i]) {
                results[i] = 'correct';
                secretLettersCount[char]--;
            }
        });

        // Yellows
        guessArr.forEach((char, i) => {
            if (results[i] !== 'correct' && secretLettersCount[char] > 0) {
                results[i] = 'present';
                secretLettersCount[char]--;
            }
        });

        // Apply to state
        guessArr.forEach((char, i) => {
            const cr = w.dir === 'down' ? w.row + i : w.row;
            const cc = w.dir === 'down' ? w.col : w.col + i;
            // Only update if current is better?
            // "Unlimited attempts": just show feedback for THIS guess.
            // If I overwrite a Green with a wrong letter, it should turn Absent? Yes.

            // Wait, if a cell is shared with another word...
            // If checking Word A makes it Absent, but it WAS Green in Word B?
            // This is the tricky part.
            // Simple approach: Interaction prioritizes logic of the *active word*.
            // So yes, it might flicker if you check A then B.
            // But if it is correct in A, it is the correct letter. It will match B too if user is correct.

            this.cwState[`${cr},${cc}`].type = results[i];
        });

        this.updateCrosswordTiles();
        this.updateKeyboardColorsCrossword(guessArr, results);

        // Check win condition
        this.checkCrosswordWin();
    }

    updateKeyboardColorsCrossword(letters, statuses) {
        // Same logic as normal
        letters.forEach((char, i) => this.updateKeyboardColor(char, statuses[i]));
    }

    checkCrosswordWin() {
        // Win if ALL cells in cwState are 'correct'
        const allCorrect = Object.values(this.cwState).every(s => s.type === 'correct');
        if (allCorrect) {
            this.isGameOver = true;
            showMessage("Parabéns! Cruzadinha completa! 🎉");
            this.stats['crossword'].won++;
            this.saveStats();
        }
    }

    addLetter(letter) {
        if (this.mode === 'crossword') return; // Handled separately

        // Adiciona em TODOS os boards ativos
        let inserted = false;
        this.boards.forEach(board => {
            if (!board.isSolved && !board.isFailed) {
                board.addLetter(letter, this.currentCol);
                inserted = true;
            }
        });

        if (inserted && this.currentCol < 4) {
            this.currentCol++;
            this.updateFocus();
        } else if (inserted) {
            this.updateFocus(); // Apenas re-foca se já estiver no final
        }
    }

    deleteLetter() {
        let deleted = false;
        // Se a coluna atual tiver letra, apaga. Se não, volta e apaga.
        // Verificamos o estado do primeiro board ativo para decidir a lógica de cursor?
        // Simpificação: Tenta apagar na atual. Se vazio, volta e apaga.

        // Verifica se algum board tem letra na coluna atual
        const hasLetterAtCurrent = this.boards.some(b => !b.isSolved && !b.isFailed && b.gridState[b.currentRow][this.currentCol] !== "");

        if (hasLetterAtCurrent) {
            this.boards.forEach(b => b.removeLetter(this.currentCol));
        } else {
            if (this.currentCol > 0) {
                this.currentCol--;
                this.boards.forEach(b => b.removeLetter(this.currentCol));
            }
        }
        this.updateFocus();
    }

    updateFocus() {
        this.boards.forEach(board => board.updateFocus(this.currentCol, !this.isGameOver));
    }

    submitGuess() {
        // Valida se palavra completa (usamos o estado do primeiro board ativo como referência)
        const activeBoard = this.boards.find(b => !b.isSolved && !b.isFailed);
        if (!activeBoard) return;

        const guessArray = activeBoard.gridState[activeBoard.currentRow];
        const guessWord = guessArray.join("");

        if (guessWord.length !== 5 || guessArray.includes("")) {
            showMessage("Só palavras com 5 letras");
            this.shakeActiveRows();
            return;
        }

        if (!this.isValidWord(guessWord)) {
            showMessage("Palavra não aceita");
            this.shakeActiveRows();
            return;
        }

        // Processa guess
        this.processTurn(guessWord);
    }

    isValidWord(word) {
        const normalized = normalizeWord(word);
        return WORDS_DATA.some(w => normalizeWord(w) === normalized);
    }

    processTurn(guessWord) {
        // 1. Check Visual Results para cada board
        const allKeyStatuses = {}; // Para atualizar teclado: letra -> status (priority)

        let pendingAnimations = 0;

        this.boards.forEach(board => {
            if (!board.isSolved && !board.isFailed) {
                const results = board.checkRow(guessWord);

                // Coleta cores para o teclado
                guessWord.split("").forEach((char, i) => {
                    const status = results[i];
                    // logica de prioridade: correct > present > absent
                    if (!allKeyStatuses[char]) allKeyStatuses[char] = status;
                    else {
                        if (status === 'correct') allKeyStatuses[char] = 'correct';
                        else if (status === 'present' && allKeyStatuses[char] !== 'correct') allKeyStatuses[char] = 'present';
                    }
                });

                // Finaliza logicalmente a linha (incrementa row)
                // Precisamos esperar a animação antes de checar game over?
                // Visualmente sim.
                board.finalizeRow(guessWord);
            }
        });

        // 2. Atualiza Teclado após animações
        setTimeout(() => {
            Object.keys(allKeyStatuses).forEach(char => {
                this.updateKeyboardColor(char, allKeyStatuses[char]);
            });

            // 3. Reset cursor
            this.currentCol = 0;
            this.updateFocus();

            // 4. Check Global Game State
            this.checkGameState();

        }, 5 * 250 + 200);
    }

    checkGameState() {
        const allSolved = this.boards.every(b => b.isSolved);
        const anyFailed = this.boards.some(b => !b.isSolved && b.currentRow >= b.ROWS); // Se esgotou linhas e não resolveu

        // Perdeu se: não resolveu todos E não tem mais tentativas em algum dos não resolvidos?
        // Não, a perda é individual? No Dueto, se uma falhar, o jogo acaba?
        // Geralmente Termo/Duetto: Voce joga ate acabar as linhas. Se ao acabar as linhas tiver algum nao resolvido, perdeu.
        // Mas se um board acabar as linhas (failed) e o outro nao? 
        // No Dueto: As linhas sao compartilhadas? Sim, voce gasta 1 tentativa para os dois.
        // Entao se `activeBoard` nao existir (todos solved ou failed) E nem todos solve: Perdeu.

        const activeBoards = this.boards.filter(b => !b.isSolved && !b.isFailed);

        if (allSolved) {
            this.handleEndGame(true);
        } else if (activeBoards.length === 0) {
            // Nao sobrou nenhum ativo e não resolveu todos -> Perdeu
            this.handleEndGame(false);
        }
    }

    handleEndGame(win) {
        this.isGameOver = true;
        this.updateStats(win);

        let msg = win ? "Fantástico! 🎉" : "Fim de jogo!";
        showMessage(msg);

        if (!win) {
            // Mostra palavras que faltaram
            setTimeout(() => {
                this.boards.filter(b => !b.isSolved).forEach(b => {
                    showMessage(`Palavra ${b.id + 1}: ${b.secretWord}`);
                });
            }, 1000);
        }

        setTimeout(() => {
            this.renderStats();
            openModal('stats-modal');
        }, 2500);
    }

    updateStats(win) {
        const s = this.stats[this.mode];
        s.played++;

        if (win) {
            s.won++;
            s.streak++;
            if (s.streak > s.maxStreak) s.maxStreak = s.streak;

            // Tentativa da vitória é a linha do ÚLTIMO board resolvido?
            // Ou o total de tentativas usadas?
            // Geralmente conta quantas linhas foram usadas no total.
            // Como todos andam juntos (exceto quando solved), pegamos o max row.
            const attemptsUsed = Math.max(...this.boards.map(b => b.currentRow)); // b.currentRow já foi incrementado após acerto? 
            // Se acertou na ultima tentativa (row 5 para termo), currentRow vira 6?
            // No finalizeRow: se acertou, isSolved=true, currentRow NAO incrementa?
            // Vamos checar Board.finalizeRow: se acertou, solved=true. Row nao muda.
            // Entao 1 tentativa = row 0. Attempts = row + 1.

            // Mas espera, se um board resolveu na tentativa 3 e o outro na 5.
            // O jogo acabou na 5.

            // Correction in Board logic: 
            // if solved, we keep currentRow pointing to the winning row?

            let maxRow = 0;
            this.boards.forEach(b => {
                // Se solved, currentRow é a linha do acerto.
                // Se não, é onde parou.
                // Na vdd finalizeRow nao incrementa se acertou.
                if (b.currentRow > maxRow) maxRow = b.currentRow;
            });
            // O index da linha é 0-based. Tentativa = index + 1.
            const attemptCount = maxRow + 1;

            s.dist[attemptCount] = (s.dist[attemptCount] || 0) + 1;
        } else {
            s.streak = 0;
            s.dist['fail']++;
        }
        this.saveStats();
    }

    startCrossword() {
        this.boardsContainer.className = '';

        console.log("Checking CROSSWORD_DATA...");
        if (typeof CROSSWORD_DATA === 'undefined') {
            console.error("CROSSWORD_DATA is undefined!");
        } else {
            console.log("CROSSWORD_DATA loaded, items:", CROSSWORD_DATA.length);
        }

        const dataSource = typeof CROSSWORD_DATA !== 'undefined' ? CROSSWORD_DATA : WORDS;
        const gen = new CrosswordGenerator(dataSource);
        const gridData = gen.generate(10);

        if (!gridData) {
            alert("Erro ao gerar palavras cruzadas. Tente novamente.");
            return;
        }

        console.log("Crossword Generated:", gridData);
        this.cwGrid = gridData;
        this.cwState = {};

        this.cwGrid.words.forEach(w => {
            for (let i = 0; i < w.word.length; i++) {
                const cr = w.dir === 'down' ? w.row + i : w.row;
                const cc = w.dir === 'down' ? w.col : w.col + i;
                if (!this.cwState[`${cr},${cc}`]) {
                    this.cwState[`${cr},${cc}`] = { char: "", type: "empty" };
                }
            }
        });

        this.renderCrossword();
        this.createKeyboard();

        // Initialize Cursor
        const firstWord = this.cwGrid.words[0]; // Assuming 0 exists
        this.cwCursor = { r: firstWord.row, c: firstWord.col };
        this.cwDirection = firstWord.dir; // 'across' or 'down'

        this.updateCrosswordFocus();
        this.startCountdown();
    }


    handleCrosswordClick(r, c) {
        if (this.cwCursor.r === r && this.cwCursor.c === c) {
            // Clicked active cell: Toggle direction
            this.cwDirection = this.cwDirection === 'across' ? 'down' : 'across';
        } else {
            // Clicked new cell: Move cursor
            this.cwCursor = { r, c };

            // Intelligence: If new cell is part of a word in current direction, keep it.
            // If not, but part of word in other direction, switch.
            // If part of both, keep current? Or prefer across?

            const isAcross = this.cwGrid.words.some(w => w.dir === 'across' && w.row === r && c >= w.col && c < w.col + w.word.length);
            const isDown = this.cwGrid.words.some(w => w.dir === 'down' && w.col === c && r >= w.row && r < w.row + w.word.length);

            if (this.cwDirection === 'across' && !isAcross && isDown) {
                this.cwDirection = 'down';
            } else if (this.cwDirection === 'down' && !isDown && isAcross) {
                this.cwDirection = 'across';
            }
        }
        this.updateCrosswordFocus();
    }

    selectCrosswordWord(index) {
        // Called from Hits Panel
        const w = this.cwGrid.words[index];
        this.cwCursor = { r: w.row, c: w.col };
        this.cwDirection = w.dir;
        this.updateCrosswordFocus();
    }

    updateCrosswordFocus() {
        const { r, c } = this.cwCursor;
        const dir = this.cwDirection;

        // 1. Highlight Active Cell
        document.querySelectorAll('.cw-cell').forEach(el => {
            el.classList.remove('active-cell', 'highlight');
        });

        const cellIndex = r * this.cwGrid.cols + c;
        const targetCell = this.cwGrid.element.children[cellIndex];
        if (targetCell) targetCell.classList.add('active-cell');

        // 2. Determine Active Word and Highlight Grid + Clue
        // We need to find the word that corresponds to the current cursor AND direction.
        const activeWord = this.cwGrid.words.find(w => {
            if (w.dir !== dir) return false;
            // Intersection check:
            if (dir === 'across') {
                return r === w.row && c >= w.col && c < w.col + w.word.length;
            } else {
                return c === w.col && r >= w.row && r < w.row + w.word.length;
            }
        });

        // Reset all hints
        if (this.cwHintsPanel) {
            this.cwHintsPanel.querySelectorAll('.hint-item').forEach(h => h.classList.remove('active-hint'));
        }

        if (activeWord) {
            // Highlight Grid Cells for this word
            for (let i = 0; i < activeWord.word.length; i++) {
                const cr = dir === 'down' ? activeWord.row + i : activeWord.row;
                const cc = dir === 'down' ? activeWord.col : activeWord.col + i;
                const idx = cr * this.cwGrid.cols + cc;
                if (this.cwGrid.element.children[idx]) {
                    this.cwGrid.element.children[idx].classList.add('highlight');
                }
            }

            // Highlight Clue
            if (this.cwHintsPanel) {
                const hItem = this.cwHintsPanel.querySelector(`.hint-item[data-id="${activeWord.id}"]`);
                if (hItem) {
                    hItem.classList.add('active-hint');
                    // Scroll logic: ensuring it's visible within the panel
                    // scrollIntoView might scroll the whole page if not careful.
                    // block: 'nearest' is safer.
                    hItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
            }
        }

        this.updateKeyboardColorsCrossword();
    }

    renderStats() {
        const s = this.stats[this.mode];
        document.getElementById('stat-played').textContent = s.played;
        const pct = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0;
        document.getElementById('stat-win-pct').textContent = pct + '%';
        document.getElementById('stat-streak').textContent = s.streak;
        document.getElementById('stat-max-streak').textContent = s.maxStreak;

        const container = document.getElementById('guess-distribution');
        container.innerHTML = '';

        let maxVal = 0;
        for (let k in s.dist) {
            if (k !== 'fail' && s.dist[k] > maxVal) maxVal = s.dist[k];
        }
        maxVal = Math.max(maxVal, 1);

        // Renderiza linhas de 1 até maxAttempts
        for (let i = 1; i <= this.maxAttempts; i++) {
            const count = s.dist[i] || 0;
            const widthPct = Math.max(8, (count / maxVal) * 100);

            const row = document.createElement('div');
            row.className = 'graph-row';
            row.innerHTML = `
                <div class="graph-num">${i}</div>
                <div class="graph-bar-container">
                    <div class="graph-bar ${count > 0 ? 'highlight' : ''}" style="width:${widthPct}%">${count}</div>
                </div>
            `;
            container.appendChild(row);
        }
    }

    createKeyboard() {
        this.keyboardContainer.innerHTML = '';
        const KEYBOARD_LAYOUT = ["QWERTYUIOP", "ASDFGHJKL", "ENTER ZXCVBNM BACKSPACE"];

        KEYBOARD_LAYOUT.forEach((rowStr, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('keyboard-row');

            let keys = rowStr.includes(' ') ? rowStr.split(' ') : rowStr.split('');
            if (index === 2 && keys.length === 1) keys = ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'];

            keys.forEach(k => {
                if (k.length > 1 && !['ENTER', 'BACKSPACE'].includes(k)) {
                    k.split('').forEach(char => this.createKeyButton(char, rowDiv));
                } else {
                    this.createKeyButton(k, rowDiv);
                }
            });
            this.keyboardContainer.appendChild(rowDiv);
        });
    }

    createKeyButton(key, container) {
        const keyBtn = document.createElement('button');
        keyBtn.className = 'key';

        if (key === 'ENTER') {
            keyBtn.textContent = 'ENTER';
            keyBtn.classList.add('wide');
            keyBtn.dataset.key = 'Enter';
        } else if (key === 'BACKSPACE') {
            keyBtn.textContent = '⌫';
            keyBtn.classList.add('wide');
            keyBtn.dataset.key = 'Backspace';
        } else {
            keyBtn.textContent = key;
            keyBtn.dataset.key = key;
        }

        keyBtn.addEventListener('click', () => this.handleVirtualKey(keyBtn.dataset.key));
        container.appendChild(keyBtn);
    }

    updateKeyboardColor(letter, status) {
        const keyBtn = document.querySelector(`.key[data-key="${letter}"]`);
        if (!keyBtn) return;

        // Se a tecla já tem uma cor mais "forte", não muda
        // Ordem: Correct > Present > Absent > ""
        const priorities = { 'correct': 3, 'present': 2, 'absent': 1, '': 0 };

        // Verifica classe atual
        let currentStatus = '';
        if (keyBtn.classList.contains('correct')) currentStatus = 'correct';
        else if (keyBtn.classList.contains('present')) currentStatus = 'present';
        else if (keyBtn.classList.contains('absent')) currentStatus = 'absent';

        if (priorities[status] > priorities[currentStatus]) {
            keyBtn.classList.remove('present', 'absent', 'correct');
            keyBtn.classList.add(status);
        }
    }

    handleEndGame(win) {
        this.isGameOver = true;
        // Assuming updateFocus is a method that clears active focus for the current game mode
        // If this is for crossword, it might be updateCrosswordFocus or similar.
        // For now, I'll assume it's a generic method or needs to be adapted.
        // If this is for Termo, it would be this.boards.forEach(b => b.updateFocus());
        // Since this is a crossword context, I'll comment it out or adapt if a clear equivalent exists.
        // this.updateFocus(); // Clear active-focus

        if (win) {
            showMessage("Parabéns!");
            this.stats[this.mode].won++;
            this.stats[this.mode].streak++;
            if (this.stats[this.mode].streak > this.stats[this.mode].maxStreak) {
                this.stats[this.mode].maxStreak = this.stats[this.mode].streak;
            }
            // This part seems specific to Termo (boards, currentRow, dist by attempts)
            // For crossword, 'attempts' might be different or not applicable in the same way.
            // I'll keep it as is, assuming 'boards[0]' refers to the primary game board if multiple exist.
            // If this is purely crossword, this logic needs re-evaluation.
            const attempts = this.boards && this.boards[0] ? this.boards[0].currentRow + 1 : 1; // Placeholder for crossword
            this.stats[this.mode].dist[attempts] = (this.stats[this.mode].dist[attempts] || 0) + 1;
        } else {
            // This part also seems Termo-specific (secrets from boards)
            const secrets = this.boards ? this.boards.filter(b => !b.isSolved).map(b => b.secretWord).join(", ") : "a palavra"; // Placeholder for crossword
            showMessage(`Fim de jogo! As palavras eram: ${secrets}`, 5000);
            this.stats[this.mode].streak = 0;
            this.stats[this.mode].dist.fail++;
        }
        this.stats[this.mode].played++;
        this.saveStats();

        setTimeout(() => {
            this.renderStats();
            openModal('stats-modal');
        }, 1500);
    }

    shakeActiveRows() {
        // This method seems specific to Termo (shaking rows on multiple boards)
        // For crossword, it might apply to the current active word or cell.
        // I'll keep the original implementation, assuming 'boards' might exist in a hybrid game.
        this.boards.forEach(board => {
            if (!board.isSolved && !board.isFailed) {
                const row = board.element.querySelectorAll('.row')[board.currentRow];
                if (row) {
                    row.classList.add('invalid');
                    setTimeout(() => row.classList.remove('invalid'), 500);
                }
            }
        });
    }

    startCountdown() {
        const el = document.getElementById('countdown');
        if (!el) return;
        const update = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setHours(24, 0, 0, 0);
            const diff = tomorrow - now;
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            el.textContent = `${h}:${m}:${s}`;
        };
        update();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(update, 1000);
    }

    shareResult() {
        let text = `Termo Clone (${this.mode}x) ${this.stats[this.mode].played}\n`;
        // Gerar emojis simplificados do último jogo seria complexo sem histórico salvo turno a turno
        // Vou colocar apenas resumo.
        text += this.isGameOver ? "Concluído!" : "Jogando...";
        navigator.clipboard.writeText(text).then(() => {
            alert("Resultado copiado!");
        });
    }
}

// Helpers
function showMessage(msg) {
    const msgContainer = document.getElementById('messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.textContent = msg;
    msgContainer.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('modal-overlay').classList.add('hidden');
}

/**
 * Gerador de Palavras Cruzadas
 */
class CrosswordGenerator {
    constructor(wordsList) {
        this.wordsList = wordsList;
        this.grid = {};
        this.placedWords = [];
        this.bounds = { minR: 0, maxR: 0, minC: 0, maxC: 0 };
    }

    generate(count = 10) {
        let attempts = 0;
        while (attempts < 50) {
            this.reset();
            if (this.tryBuild(count)) {
                return this.normalizeGrid();
            }
            attempts++;
        }
        console.error("Failed to generate crossword after 50 attempts");
        return this.normalizeGrid();
    }

    reset() {
        this.placedWords = [];
        this.drawnGrid = new Map(); // Key: "r,c", Value: letter
        this.occupied = new Set();
    }

    tryBuild(totalWords) {
        // Pick `totalWords` random items
        const pool = [...this.wordsList].sort(() => 0.5 - Math.random());
        const selected = [];
        const target = totalWords;

        // Place first word at 0,0 Horizontal
        const first = pool.pop();
        if (!first) return false;

        this.placeWord(first, 0, 0, 'across');
        selected.push(first);

        // Try to place others
        while (selected.length < target && pool.length > 0) {
            let placed = false;

            for (let i = 0; i < pool.length; i++) {
                const candidate = pool[i];
                // Check fit. Candidate might be String OR Object.
                // findFit should handle extraction
                const fit = this.findFit(candidate);
                if (fit) {
                    this.placeWord(candidate, fit.row, fit.col, fit.dir);
                    selected.push(candidate);
                    pool.splice(i, 1); // Remove used
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                break;
            }
        }

        return selected.length === target;
    }

    // Helper to get string from item (String or Object)
    getWordStr(item) {
        return (typeof item === 'object' && item.word) ? item.word : item;
    }

    getClue(item) {
        return (typeof item === 'object' && item.clue) ? item.clue : null;
    }

    findFit(wordItem) {
        const wordStr = this.getWordStr(wordItem);

        for (let i = 0; i < wordStr.length; i++) {
            const char = wordStr[i];

            for (const [key, val] of this.drawnGrid) {
                if (val === char) {
                    const [r, c] = key.split(',').map(Number);

                    if (this.isIntersection(r, c)) continue;

                    const existingWord = this.getWordAt(r, c);
                    if (!existingWord) continue;

                    const newDir = existingWord.dir === 'across' ? 'down' : 'across';

                    const startR = newDir === 'down' ? r - i : r;
                    const startC = newDir === 'down' ? c : c - i;

                    if (this.canPlace(wordStr, startR, startC, newDir)) {
                        return { row: startR, col: startC, dir: newDir };
                    }
                }
            }
        }
        return null;
    }

    isIntersection(r, c) {
        let count = 0;
        for (let w of this.placedWords) {
            if (this.wordContains(w, r, c)) count++;
        }
        return count > 1;
    }

    getWordAt(r, c) {
        return this.placedWords.find(w => this.wordContains(w, r, c));
    }

    wordContains(w, r, c) {
        // w.word is assumed to be the string here because placedWords stores the string in .word property (see placeWord)
        if (w.dir === 'across') {
            return r === w.row && c >= w.col && c < w.col + w.word.length;
        } else {
            return c === w.col && r >= w.row && r < w.row + w.word.length;
        }
    }

    canPlace(wordStr, r, c, dir) {
        for (let i = 0; i < wordStr.length; i++) {
            const cr = dir === 'down' ? r + i : r;
            const cc = dir === 'down' ? c : c + i;
            const char = wordStr[i];

            const existingChar = this.drawnGrid.get(`${cr},${cc}`);

            if (existingChar) {
                if (existingChar !== char) return false;
            } else {
                if (this.hasNeighborPerpendicular(cr, cc, dir)) return false;
            }

            if (i === 0) {
                if (this.drawnGrid.has(`${dir === 'down' ? cr - 1 : cr},${dir === 'down' ? cc : cc - 1}`)) return false;
            }
            if (i === wordStr.length - 1) {
                if (this.drawnGrid.has(`${dir === 'down' ? cr + 1 : cr},${dir === 'down' ? cc : cc + 1}`)) return false;
            }
        }
        return true;
    }

    hasNeighborPerpendicular(r, c, dir) {
        const deltas = dir === 'across' ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (const [dr, dc] of deltas) {
            if (this.drawnGrid.has(`${r + dr},${c + dc}`)) return true;
        }
        return false;
    }

    placeWord(wordItem, r, c, dir) {
        const wordStr = this.getWordStr(wordItem);
        const clue = this.getClue(wordItem);

        // Store 'word' as the string to maintain compatibility with other methods
        // Store 'clue' separately
        this.placedWords.push({ word: wordStr, clue: clue, row: r, col: c, dir, id: this.placedWords.length });

        for (let i = 0; i < wordStr.length; i++) {
            const cr = dir === 'down' ? r + i : r;
            const cc = dir === 'down' ? c : c + i;
            this.drawnGrid.set(`${cr},${cc}`, wordStr[i]);
            this.occupied.add(`${cr},${cc}`);
        }
    }

    normalizeGrid() {
        if (this.placedWords.length === 0) return null;

        let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        this.occupied.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
        });

        // Shift everything to 0,0
        const rows = maxR - minR + 1;
        const cols = maxC - minC + 1;

        const finalWords = this.placedWords.map(w => ({
            ...w,
            row: w.row - minR,
            col: w.col - minC
        }));

        return { words: finalWords, rows, cols };
    }
}

// Inicializa o jogo
const game = new Game();
