// UIの更新とイベント処理を担当

const UI = {
    levelText: document.getElementById('level-text'),
    expBar: document.getElementById('exp-bar'),
    skillScreen: document.getElementById('skill-selection-screen'),
    skillCardsContainer: document.getElementById('skill-cards-container'),
    startScreen: document.getElementById('start-screen'),
    branchScreen: document.getElementById('branch-selection-screen'),
    branchCardsContainer: document.getElementById('branch-cards-container'),

    updateExp(currentExp, maxExp, level) {
        this.levelText.innerText = level;
        const percent = Math.min((currentExp / maxExp) * 100, 100);
        this.expBar.style.width = percent + '%';
    },

    showSkillSelection(skills, onSelectCallback) {
        this.skillCardsContainer.innerHTML = '';
        
        skills.forEach(skill => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            
            let levelDisplay = `Lv.${skill.level}`;
            if (skill.requiresBranch) {
                levelDisplay += `<br><span style="font-size:10px; color:#ffaa00;">【進化可能】</span>`;
            } else if (skill.level === 7) {
                levelDisplay += ` (MAX)`;
            }

            card.innerHTML = `
                <div class="skill-image" style="background: none; border: none; overflow: hidden; padding: 0;">
                    <img src="${skill.image}" alt="${skill.name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" onerror="this.style.display='none'">
                </div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-level" style="font-size: 13px; color: ${skill.level === 7 ? '#ff5555' : '#ffd700'}; margin-bottom: 5px; font-weight: bold; line-height: 1.2;">
                    ${levelDisplay}
                </div>
                <div class="skill-desc">${skill.desc}</div>
            `;
            
            card.onclick = () => {
                this.hideSkillSelection();
                onSelectCallback(skill);
            };
            
            this.skillCardsContainer.appendChild(card);
        });

        this.skillScreen.classList.remove('hidden');
    },

    hideSkillSelection() {
        this.skillScreen.classList.add('hidden');
    },

    // 分岐選択画面の表示（アイコン表示を追加）
    showBranchSelection(branches, onSelectCallback) {
        this.branchCardsContainer.innerHTML = '';
        
        branches.forEach(branch => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            card.style.borderColor = '#ff8800'; // 進化用を目立たせる
            
            card.innerHTML = `
                <div class="skill-image" style="background: none; border: none; overflow: hidden; padding: 0;">
                    <img src="${branch.image}" alt="${branch.name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" onerror="this.style.display='none'">
                </div>
                <div class="skill-name" style="color: #ffaa00; font-size: 15px; margin-bottom: 10px;">${branch.name}</div>
                <div class="skill-desc" style="font-size: 11px;">${branch.desc}</div>
            `;
            
            card.onclick = () => {
                this.hideBranchSelection();
                onSelectCallback(branch.id);
            };
            
            this.branchCardsContainer.appendChild(card);
        });

        this.branchScreen.classList.remove('hidden');
    },

    hideBranchSelection() {
        this.branchScreen.classList.add('hidden');
    },

    hideStartScreen() {
        this.startScreen.classList.add('hidden');
    }
};