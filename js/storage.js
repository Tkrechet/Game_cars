const STORAGE_KEY = 'carsGameResults';
const CAR_SELECTION_KEY = 'carsGameSelectedSkins';


function savePlayerResult(name, score, timeSpent, levelReached) {
    try {
        // Получаем существующие данные
        const existingData = localStorage.getItem(STORAGE_KEY);
        let results = existingData ? JSON.parse(existingData) : [];
        
        // Добавляем новый результат
        results.push({
            name: name,
            score: score,
            timeSpent: timeSpent,
            levelReached: levelReached,
            date: new Date().toISOString() // Добавляем дату для дополнительной информации
        });
        
        // Сохраняем обратно в localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch (error) {
        console.error('Ошибка при сохранении результата:', error);
    }
}

/**
 * Возвращает таблицу лидеров, отсортированную по очкам (или по времени, если очки равны)
 * @returns {Array} Массив результатов игроков
 */
function getLeaderboard() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        
        // Если данных нет, возвращаем пустой массив
        if (!data) {
            return [];
        }
        
        const results = JSON.parse(data);
        
        // Сортируем: сначала по очкам (по убыванию), затем по времени (по возрастанию)
        results.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Больше очков = лучше
            }
            return a.timeSpent - b.timeSpent; // Меньше времени = лучше
        });
        
        return results;
    } catch (error) {
        console.error('Ошибка при получении таблицы лидеров:', error);
        return [];
    }
}

/**
 * Сохраняет выбранные скины машин (игрок/соперник)
 * @param {string} playerCarKey - 'car1' или 'car2' для машины игрока
 */
function saveCarSelection(playerCarKey) {
    try {
        const normalizedPlayer = playerCarKey === 'car1' ? 'car1' : 'car2';
        const enemy = normalizedPlayer === 'car1' ? 'car2' : 'car1';
        const payload = { player: normalizedPlayer, enemy };
        localStorage.setItem(CAR_SELECTION_KEY, JSON.stringify(payload));
        return payload;
    } catch (error) {
        console.error('Ошибка при сохранении выбора машины:', error);
        return { player: 'car2', enemy: 'car1' };
    }
}

/**
 * Возвращает сохраненные скины машин или значения по умолчанию
 * @returns {{player: string, enemy: string}}
 */
function getCarSelection() {
    try {
        const stored = localStorage.getItem(CAR_SELECTION_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.player === 'car1' || parsed.player === 'car2') && (parsed.enemy === 'car1' || parsed.enemy === 'car2')) {
                return parsed;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке выбора машины:', error);
    }
    // Значения по умолчанию соответствуют текущей логике (игрок car2, соперник car1)
    return { player: 'car2', enemy: 'car1' };
}

