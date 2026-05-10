// save.js: ゲームデータのセーブとロードを管理

/**
 * 現在のゲーム状態をブラウザのLocalStorageに保存する
 */
function saveGameData() {
    if (!player) return;

    // 技のプログラム実体（無限ループの原因）を避け、必要な値だけを抜き出す
    let safeSkillsData = {};
    for (let key in activeSkills) {
        if (activeSkills[key]) {
            safeSkillsData[key] = {
                level: activeSkills[key].level || 1,
                evo4: activeSkills[key].evo4 || null,
                evo7: activeSkills[key].evo7 || null
            };
        }
    }

    // 保存用オブジェクトの作成
    let saveData = {
        player: {
            x: player.x,
            y: player.y,
            hp: player.hp,
            maxHp: player.maxHp
        },
        stats: {
            level: playerLevel,
            exp: currentExp,
            maxExp: maxExp,
            gameTime: gameTime,
            frameCount: frameCount
        },
        skills: safeSkillsData
    };

    try {
        // JSON文字列に変換して保存
        const jsonStr = JSON.stringify(saveData);
        localStorage.setItem('survivorSaveData', jsonStr);
        console.log("🛠 ゲームデータを保存しました:", saveData);
    } catch (e) {
        console.error("❌ セーブ失敗:", e);
    }
}

/**
 * 保存されたデータを読み込む
 * @returns {Object|null} 保存されたデータオブジェクト、なければnull
 */
function loadGameData() {
    try {
        const dataStr = localStorage.getItem('survivorSaveData');
        if (dataStr) {
            const parsed = JSON.parse(dataStr);
            console.log("📦 セーブデータを読み込みました:", parsed);
            return parsed;
        }
    } catch (e) {
        console.error("❌ ロード失敗:", e);
    }
    return null;
}

/**
 * セーブデータを完全に削除する（ゲームオーバー時などに使用）
 */
function clearGameData() {
    localStorage.removeItem('survivorSaveData');
    console.log("🗑 セーブデータを消去しました");
}