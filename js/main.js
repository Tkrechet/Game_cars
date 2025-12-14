
function getExistingPlayerNames() {
    const leaderboard = getLeaderboard();
    return leaderboard.map(result => result.name).filter(name => name && name.trim() !== '');
}

function isNameInLeaderboard(name) {
    const existingNames = getExistingPlayerNames();
    return existingNames.some(existingName => 
        existingName.toLowerCase().trim() === name.toLowerCase().trim()
    );
}

function showNameError(message) {
    const errorElement = document.getElementById('nameError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideNameError() {
    const errorElement = document.getElementById('nameError');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function getInitializedCarSelection() {
    const selection = typeof getCarSelection === 'function' ? getCarSelection() : { player: 'car2', enemy: 'car1' };
    if (typeof saveCarSelection === 'function') {
        return saveCarSelection(selection.player);
    }
    return selection;
}

function syncCarSlots(selection) {
    const playerSlot = document.querySelector('.car-slot[data-slot="player"]');
    const enemySlot = document.querySelector('.car-slot[data-slot="enemy"]');
    if (!playerSlot || !enemySlot) return;
    const playerCard = document.querySelector(`.car-card[data-car-key="${selection.player}"]`);
    const enemyCard = document.querySelector(`.car-card[data-car-key="${selection.enemy}"]`);
    if (playerCard && playerCard.parentElement !== playerSlot) {
        playerSlot.appendChild(playerCard);
    }
    if (enemyCard && enemyCard.parentElement !== enemySlot) {
        enemySlot.appendChild(enemyCard);
    }
}

function persistSelectionFromDom() {
    const playerCard = document.querySelector('.car-slot[data-slot="player"] .car-card');
    const playerKey = playerCard ? playerCard.getAttribute('data-car-key') : 'car2';
    if (typeof saveCarSelection === 'function') {
        return saveCarSelection(playerKey);
    }
    return { player: playerKey, enemy: playerKey === 'car1' ? 'car2' : 'car1' };
}

function initCarDragAndDrop() {
    const slots = document.querySelectorAll('.car-slot');
    const cards = document.querySelectorAll('.car-card');
    if (!slots.length || !cards.length) {
        return;
    }

    const initialSelection = getInitializedCarSelection();
    syncCarSlots(initialSelection);

    cards.forEach(card => {
        card.setAttribute('draggable', 'true');
    });

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    cards.forEach(card => {
        card.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('car-key', card.getAttribute('data-car-key'));
            event.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');

            const imgElement = card.querySelector('img');
            let dragNode = null;
            let offsetX = 32;
            let offsetY = 32;
            
            if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
                
                const dragImg = imgElement.cloneNode(true);
                dragImg.style.width = '64px';
                dragImg.style.height = '64px';
                dragImg.style.position = 'fixed';
                dragImg.style.top = '0';
                dragImg.style.left = '0';
                dragImg.style.pointerEvents = 'none';
                dragImg.style.opacity = '0.95';
                dragImg.style.transform = 'rotate(5deg)';
                dragImg.style.zIndex = '10000';
                dragImg.style.objectFit = 'contain';
                dragNode = dragImg;
            } else {
                
                const fallback = document.createElement('div');
                fallback.style.width = '64px';
                fallback.style.height = '64px';
                fallback.style.position = 'fixed';
                fallback.style.top = '0';
                fallback.style.left = '0';
                fallback.style.pointerEvents = 'none';
                fallback.style.opacity = '0.9';
                fallback.style.zIndex = '10000';
                fallback.style.borderRadius = '8px';
                fallback.style.background = 'linear-gradient(135deg, rgba(0,240,255,0.3), rgba(176,38,255,0.3))';
                fallback.style.border = '1px solid rgba(0,240,255,0.4)';
                dragNode = fallback;
            }

            if (dragNode) {
                document.body.appendChild(dragNode);
                card._dragImageElement = dragNode;
                
                void dragNode.offsetWidth;
                const rect = dragNode.getBoundingClientRect();
                event.dataTransfer.setDragImage(dragNode, rect.width / 2, rect.height / 2);
                
                if (isSafari) {
                    dragNode.style.opacity = '0.01';
                    dragNode.style.transform = 'none';
                } else {
                    dragNode.style.top = '-1000px';
                    dragNode.style.left = '-1000px';
                }
            }
        });
        
        card.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            
            if (this._dragImageElement && this._dragImageElement.parentNode) {
                this._dragImageElement.parentNode.removeChild(this._dragImageElement);
                this._dragImageElement = null;
            }
        });
    });

    slots.forEach(slot => {
        slot.addEventListener('dragover', (event) => {
            event.preventDefault();
            slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });
        slot.addEventListener('drop', (event) => {
            event.preventDefault();
            slot.classList.remove('drag-over');
            const carKey = event.dataTransfer.getData('car-key');
            const draggedCard = document.querySelector(`.car-card[data-car-key="${carKey}"]`);
            if (!draggedCard) return;
            const currentSlot = draggedCard.closest('.car-slot');
            if (currentSlot === slot) return;

            const slotCard = slot.querySelector('.car-card');
            if (slotCard && currentSlot) {
                currentSlot.appendChild(slotCard);
            }
            slot.appendChild(draggedCard);

            const saved = persistSelectionFromDom();
            syncCarSlots(saved);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    
    const startForm = document.getElementById('startForm');
    const playerNameInput = document.getElementById('playerName');

    initCarDragAndDrop();

    const lastPlayerName = localStorage.getItem('lastPlayerName');
    if (lastPlayerName && playerNameInput) {
        playerNameInput.value = lastPlayerName;
        
        if (isNameInLeaderboard(lastPlayerName)) {
            showNameError('Это имя уже занято, выбери другое имя');
        }
    }

    if (playerNameInput) {
        playerNameInput.addEventListener('input', function() {
            const playerName = playerNameInput.value.trim();
            if (playerName === '') {
                hideNameError();
                return;
            }
            
            if (isNameInLeaderboard(playerName)) {
                showNameError('Это имя уже занято, выбери другое имя');
            } else {
                hideNameError();
            }
        });
    }

    startForm.addEventListener('submit', function(event) {
        
        event.preventDefault();

        const playerName = playerNameInput.value.trim();

        if (playerName === '') {
            alert('Пожалуйста, введите ваше имя');
            return;
        }

        if (isNameInLeaderboard(playerName)) {
            showNameError('Это имя уже занято, выбери другое имя');
            playerNameInput.focus();
            return;
        }

        const savedPlayerName = localStorage.getItem('currentPlayerName');

        if (savedPlayerName && savedPlayerName !== playerName) {
            
            localStorage.removeItem('savedLevel');
            localStorage.removeItem('savedRound');
            localStorage.removeItem('savedTotalRounds');
            localStorage.removeItem('savedLevelWins');
            localStorage.removeItem('savedLevelLosses');
            localStorage.removeItem('savedScore');
            
            localStorage.removeItem('lastPlayerName');
        } else if (savedPlayerName && savedPlayerName === playerName) {
            
            localStorage.setItem('lastPlayerName', playerName);
        } else {
            
            localStorage.removeItem('lastPlayerName');
        }

        localStorage.setItem('currentPlayerName', playerName);

        window.location.href = 'game.html';
    });

    const viewRatingBtn = document.getElementById('viewRatingBtn');
    if (viewRatingBtn) {
        viewRatingBtn.addEventListener('click', function() {
            displayRatingModal();
        });
    }

    const closeRatingBtn = document.getElementById('closeRatingBtn');
    if (closeRatingBtn) {
        closeRatingBtn.addEventListener('click', function() {
            closeRatingModal();
        });
    }

    const ratingModal = document.getElementById('ratingModal');
    if (ratingModal) {
        ratingModal.addEventListener('click', function(event) {
            if (event.target === ratingModal) {
                closeRatingModal();
            }
        });
    }
});

function displayRatingModal() {
    const modal = document.getElementById('ratingModal');
    const tbody = document.getElementById('ratingTableBody');
    
    if (!modal || !tbody) return;

    const leaderboard = getLeaderboard();

    tbody.innerHTML = '';
    
    if (leaderboard.length === 0) {
        
        const row = document.createElement('tr');
        row.className = 'no-results-row';
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'Пока нет результатов. Будьте первым!';
        cell.style.textAlign = 'center';
        cell.style.padding = '30px';
        cell.style.color = 'var(--text-muted)';
        row.appendChild(cell);
        tbody.appendChild(row);
    } else {
        
        leaderboard.forEach((result, index) => {
            const row = document.createElement('tr');
            row.className = index < 3 ? 'top-player' : '';

            const placeCell = document.createElement('td');
            placeCell.className = 'place-cell';
            placeCell.textContent = index + 1;
            if (index === 0) {
                placeCell.innerHTML = '🥇';
            } else if (index === 1) {
                placeCell.innerHTML = '🥈';
            } else if (index === 2) {
                placeCell.innerHTML = '🥉';
            }
            row.appendChild(placeCell);

            const nameCell = document.createElement('td');
            nameCell.className = 'name-cell';
            nameCell.textContent = result.name || 'Неизвестный игрок';
            row.appendChild(nameCell);

            const scoreCell = document.createElement('td');
            scoreCell.className = 'score-cell';
            scoreCell.textContent = result.score || 0;
            row.appendChild(scoreCell);

            const timeCell = document.createElement('td');
            timeCell.className = 'time-cell';
            const timeSpent = result.timeSpent || 0;
            const minutes = Math.floor(timeSpent / 60);
            const seconds = Math.floor(timeSpent % 60);
            timeCell.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            row.appendChild(timeCell);

            const levelCell = document.createElement('td');
            levelCell.className = 'level-cell';
            levelCell.textContent = result.levelReached || 1;
            row.appendChild(levelCell);
            
            tbody.appendChild(row);
        });
    }

    modal.style.display = 'flex';
}

function closeRatingModal() {
    const modal = document.getElementById('ratingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

