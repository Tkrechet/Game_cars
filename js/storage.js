const STORAGE_KEY = 'carsGameResults';

/**
 * Сохраняет результат игрока в localStorage
 * @param {string} name - Имя игрока
 * @param {number} score - Количество очков
 * @param {number} timeSpent - Затраченное время (в секундах)
 * @param {number} levelReached - Достигнутый уровень
 */
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

