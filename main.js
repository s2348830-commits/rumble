// エラーキャッチ機能（画面に赤文字でエラーを出すため）
let gameErrors = [];
window.onerror = function (msg, url, line) {
    gameErrors.push("Error: " + msg + " (Line " + line + ")");
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let player;
let enemies = [];
let expGems = [];
let isPaused = true;
let isStarted = false;

// 変数管理
let gameTime = 0;
let frameCount = 0;
let spawnTimer = 0;
let basicAttacks = [];
// ★負荷対策：ジェムの限界数を300に制限（経験値は圧縮されるためロストしません）
const MAX_GEMS_LIMIT = 300;
//背景画像
const bgImage = new Image();
bgImage.src = 'image/background.png';

// プレイヤー画像の読み込み
const pImages = {
    idle: new Image(), idle_back: new Image(),
    run_right: [new Image(), new Image()], run_left: [new Image(), new Image()],
    attack: [new Image(), new Image(), new Image()],
    death: new Image()
};
pImages.idle.src = 'image/player/idles.png';
pImages.idle_back.src = 'image/player/idles_back.png';
pImages.run_right[0].src = 'image/player/run1.png'; pImages.run_right[1].src = 'image/player/run2.png';
pImages.run_left[0].src = 'image/player/runs1.png'; pImages.run_left[1].src = 'image/player/runs2.png';
pImages.attack[0].src = 'image/player/attack.png'; pImages.attack[1].src = 'image/player/attack2.png'; pImages.attack[2].src = 'image/player/attack3.png';
pImages.death.src = 'image/player/death.png';
// 基本スキルリスト（新技を追加）
const availableSkills = [
    { id: 'vampire', name: 'ヴァンパイアたる者', image: 'image/icon/ヴァンパイアたる者.png' },
    { id: 'punishment', name: '懲戒', image: 'image/icon/懲戒.png' },
    { id: 'crimson_barrier', name: '緋色の結界', image: 'image/icon/緋色の結界.png' },
    { id: 'wrath_of_god', name: '神の怒り', image: 'image/icon/神の怒り.png' },
    { id: 'holy_punishment', name: '神怒天罰', image: 'image/icon/神怒天罰.png' },
    { id: 'frost_storm', name: '寒霜ストーム', image: 'image/icon/寒霜ストーム.png' },
    { id: 'ice_barrage', name: '氷の塊', image: 'image/icon/氷の塊.png' },
    { id: 'genki_no_kakato', name: '玄亀の踵', image: 'image/icon/玄亀の踵.png' },
    { id: 'genbu_kourin', name: '玄武降臨', image: 'image/icon/玄武降臨.png' }
];

let activeSkills = {};
let playerLevel = 1;
let currentExp = 0;
let maxExp = 10;

// 画面リサイズ処理
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// ==========================================
// ★完全版コントローラー (操作不能バグ対策)
// ==========================================
const UniversalInput = {
    vx: 0, vy: 0,
    keys: { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, W: false, A: false, S: false, D: false },
    joyStartX: 0, joyStartY: 0, isDragging: false,
    zone: document.getElementById('joystick-zone'),
    base: document.getElementById('joystick-base'),
    knob: document.getElementById('joystick-knob'),

    init() {
        window.addEventListener('keydown', e => { if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true; });
        window.addEventListener('keyup', e => { if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false; });

        if (this.zone) {
            this.zone.addEventListener('pointerdown', e => {
                this.isDragging = true;
                this.joyStartX = e.clientX; this.joyStartY = e.clientY;
                if (this.base) {
                    this.base.style.left = this.joyStartX + 'px';
                    this.base.style.top = this.joyStartY + 'px';
                    this.base.classList.remove('hidden');
                }
                if (this.knob) this.knob.style.transform = `translate(-50%, -50%)`;
            });
            this.zone.addEventListener('pointermove', e => {
                if (!this.isDragging) return;
                let dx = e.clientX - this.joyStartX;
                let dy = e.clientY - this.joyStartY;
                let dist = Math.hypot(dx, dy);
                let maxDist = 40;
                if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
                this.vx = dx / maxDist; this.vy = dy / maxDist;
                if (this.knob) this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            });
            const stopDrag = () => {
                this.isDragging = false; this.vx = 0; this.vy = 0;
                if (this.base) this.base.classList.add('hidden');
            };
            this.zone.addEventListener('pointerup', stopDrag);
            this.zone.addEventListener('pointercancel', stopDrag);
            this.zone.addEventListener('pointerleave', stopDrag);
        }
    },

    getVelocity() {
        let finalVx = this.vx;
        let finalVy = this.vy;

        let keyVx = 0, keyVy = 0;
        if (this.keys.w || this.keys.W || this.keys.ArrowUp) keyVy -= 1;
        if (this.keys.s || this.keys.S || this.keys.ArrowDown) keyVy += 1;
        if (this.keys.a || this.keys.A || this.keys.ArrowLeft) keyVx -= 1;
        if (this.keys.d || this.keys.D || this.keys.ArrowRight) keyVx += 1;

        if (keyVx !== 0 || keyVy !== 0) {
            let dist = Math.hypot(keyVx, keyVy);
            finalVx = keyVx / dist;
            finalVy = keyVy / dist;
        }
        return { vx: finalVx, vy: finalVy };
    }
};
UniversalInput.init();

// ==========================================
// ★技の実体化
// ==========================================
function createSkillInstance(id) {
    try {
        switch (id) {
            case 'vampire': return typeof VampireSkill !== 'undefined' ? new VampireSkill() : (typeof Vampire !== 'undefined' ? new Vampire() : null);
            case 'punishment': return typeof PunishmentSkill !== 'undefined' ? new PunishmentSkill() : (typeof Punishment !== 'undefined' ? new Punishment() : null);
            case 'crimson_barrier': return typeof CrimsonBarrierSkill !== 'undefined' ? new CrimsonBarrierSkill() : (typeof CrimsonBarrier !== 'undefined' ? new CrimsonBarrier() : null);
            case 'wrath_of_god': return typeof WrathOfGodSkill !== 'undefined' ? new WrathOfGodSkill() : (typeof WrathOfGod !== 'undefined' ? new WrathOfGod() : null);
            case 'holy_punishment': return typeof HolyPunishmentSkill !== 'undefined' ? new HolyPunishmentSkill() : (typeof HolyPunishment !== 'undefined' ? new HolyPunishment() : null);
            case 'fusion_light_shadow': return typeof FusionLightShadowSkill !== 'undefined' ? new FusionLightShadowSkill() : (typeof LightShadowSkill !== 'undefined' ? new LightShadowSkill() : null);
            case 'frost_storm': return typeof FrostStormSkill !== 'undefined' ? new FrostStormSkill() : (typeof FrostStorm !== 'undefined' ? new FrostStorm() : null);
            case 'ice_barrage': return typeof IceBarrageSkill !== 'undefined' ? new IceBarrageSkill() : (typeof IceBarrage !== 'undefined' ? new IceBarrage() : null);
            case 'absolute_zero': return typeof AbsoluteZeroSkill !== 'undefined' ? new AbsoluteZeroSkill() : (typeof AbsoluteZero !== 'undefined' ? new AbsoluteZero() : null);
            case 'genki_no_kakato': return typeof GenkiNoKakatoSkill !== 'undefined' ? new GenkiNoKakatoSkill() : null;
            case 'genbu_kourin': return typeof GenbuKourinSkill !== 'undefined' ? new GenbuKourinSkill() : null;
            case 'ice_genbu': return typeof IceGenbuSkill !== 'undefined' ? new IceGenbuSkill() : null;
        }
    } catch (e) {
        gameErrors.push(`技「${id}」の生成エラー: ` + e.message);
    }
    return null;
}

// プレイヤーにダメージを与える関数（未定義によるクラッシュを防ぐ）
function damagePlayer(amount) {
    if (player.damageTimer > 0) return; // 無敵時間中はダメージを受けない
    player.hp -= amount;
    player.damageTimer = 30; // 被弾後の無敵フレーム
    if (player.hp < 0) player.hp = 0; // HPがマイナスにならないようにする
}

// --- ゲーム初期化（セーブ復元対応） ---
function initGame() {
    // セーブデータをロード
    const saved = typeof loadGameData === 'function' ? loadGameData() : null;

    player = {
        x: saved ? saved.player.x : width / 2,
        y: saved ? saved.player.y : height / 2,
        radius: 15, speed: 3.5,
        hp: saved ? saved.player.hp : 100,
        maxHp: saved ? saved.player.maxHp : 100,
        state: 'idle', animFrame: 0, damageTimer: 0, basicAttackTimer: 0,
        prevX: saved ? saved.player.x : width / 2,
        prevY: saved ? saved.player.y : height / 2,
        update(vx, vy) {
            if (this.hp <= 0) {
                this.state = 'death';
                return; 
            }
            this.x += vx * this.speed; this.y += vy * this.speed;
            let dx = this.x - this.prevX, dy = this.y - this.prevY;
            this.prevX = this.x; this.prevY = this.y;
            if (this.state !== 'attack' || this.animFrame >= 30) {
                if (dx > 0.5) this.state = 'run_right'; else if (dx < -0.5) this.state = 'run_left';
                else if (dy < -0.5) this.state = 'idle_back'; else this.state = 'idle';
            }
            this.animFrame++; if (this.damageTimer > 0) this.damageTimer--;
        },
        draw(ctx) {
            ctx.save(); ctx.translate(this.x, this.y);
            if (this.damageTimer > 0 && this.hp > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.shadowBlur = 20; ctx.shadowColor = "red"; }
            if (this.damageTimer > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.shadowBlur = 20; ctx.shadowColor = "red"; }
            let img = pImages.idle; let idx = Math.floor(this.animFrame / 10) % 2;
            if (this.state === 'death') img = pImages.death;
            else if (this.state === 'idle_back') img = pImages.idle_back;
            else if (this.state === 'run_right') img = pImages.run_right[idx];
            else if (this.state === 'run_left') img = pImages.run_left[idx];
            else if (this.state === 'attack') img = pImages.attack[Math.floor(this.animFrame / 8) % 3];
            if (img && img.complete) ctx.drawImage(img, -25, -25, 50, 50);
            ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
            if (this.state !== 'death') {
                ctx.fillStyle = '#333'; ctx.fillRect(-25, 30, 50, 6);
                ctx.fillStyle = this.hp > this.maxHp * 0.3 ? '#0f0' : '#f00';
                ctx.fillRect(-25, 30, 50 * (Math.max(0, this.hp) / this.maxHp), 6);
            }
            ctx.restore();
        }
    };

    enemies = []; expGems = []; basicAttacks = []; activeSkills = {};
    
    // 生成物配列の初期化（メモリリーク対策）
    if (typeof poisonFields !== 'undefined') poisonFields.length = 0;
    if (typeof enemyProjectiles !== 'undefined') enemyProjectiles.length = 0;

    if (saved) {
        playerLevel = saved.stats.level;
        currentExp = saved.stats.exp;
        maxExp = saved.stats.maxExp;
        gameTime = saved.stats.gameTime;
        frameCount = saved.stats.frameCount;
        // 技の復元
        for (let key in saved.skills) {
            let info = saved.skills[key];
            let inst = createSkillInstance(key);
            if (inst) {
                inst.level = info.level; inst.evo4 = info.evo4; inst.evo7 = info.evo7;
                if (inst.updateStats) inst.updateStats();
                activeSkills[key] = inst;
            }
        }
    } else {
        playerLevel = 1; currentExp = 0; maxExp = 10; gameTime = 0; frameCount = 0;
    }
    spawnTimer = 0;
    canvas.style.filter = 'none';
    if (typeof UI !== 'undefined') UI.updateExp(currentExp, maxExp, playerLevel);
}

function processBasicAttack() {

    player.basicAttackTimer++;
    if (player.basicAttackTimer >= 45) {
        player.basicAttackTimer = 0;
        let target = null; let minDist = 100;

       enemies.forEach(e => {
            let dist = Math.hypot(e.x - player.x, e.y - player.y);
            if (dist < minDist) { minDist = dist; target = e; }
        });
        
        if (target) {
            player.state = 'attack'; player.animFrame = 0;
            target.hp -= 15;
            basicAttacks.push({ x: target.x, y: target.y, life: 10 });
            
            if (target.hp <= 0) {
                if (typeof target.onDeath === 'function') target.onDeath();
                const idx = enemies.indexOf(target);
                if (idx > -1) {
                    if (typeof spawnExpGem === 'function') spawnExpGem(target.x, target.y, target.exp || 5);
                    enemies.splice(idx, 1);
                }
            }
        }
    }
}

function spawnEnemy() {
    if (isPaused) return;
    
    // スマホでの処理落ち対策として、敵の最大数を300体に制限
    if (enemies.length >= 300) return;

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(width, height) / 2 + 50;
    const ex = player.x + Math.cos(angle) * dist;
    const ey = player.y + Math.sin(angle) * dist;
    if (typeof Enemy !== 'undefined') enemies.push(new Enemy(ex, ey));
}

function getSkillDescription(id, level) {
    try {
        if (id === 'vampire') return level === 4 ? VAMPIRE_TEXT[4].base : (level === 7 ? VAMPIRE_TEXT[7].base : VAMPIRE_TEXT[level]);
        if (id === 'crimson_barrier') return level === 4 ? CRIMSON_BARRIER_TEXT[4].base : (level === 7 ? CRIMSON_BARRIER_TEXT[7].base : CRIMSON_BARRIER_TEXT[level]);
        if (id === 'punishment') return level === 4 ? PUNISHMENT_TEXT[4].base : (level === 7 ? PUNISHMENT_TEXT[7].base : PUNISHMENT_TEXT[level]);
        if (id === 'wrath_of_god') return level === 4 ? WRATH_OF_GOD_TEXT[4].base : (level === 7 ? WRATH_OF_GOD_TEXT[7].base : WRATH_OF_GOD_TEXT[level]);
        if (id === 'holy_punishment') return level === 4 ? HOLY_PUNISHMENT_TEXT[4].base : (level === 7 ? HOLY_PUNISHMENT_TEXT[7].base : HOLY_PUNISHMENT_TEXT[level]);
        if (id === 'frost_storm') return level === 4 ? FROST_STORM_TEXT[4].base : (level === 7 ? FROST_STORM_TEXT[7].base : FROST_STORM_TEXT[level]);
        if (id === 'ice_barrage') return level === 4 ? ICE_BARRAGE_TEXT[4].base : (level === 7 ? ICE_BARRAGE_TEXT[7].base : ICE_BARRAGE_TEXT[level]);
        if (id === 'fusion_light_shadow') return FUSION_LIGHT_SHADOW_TEXT[7];
        if (id === 'absolute_zero') return ABSOLUTE_ZERO_TEXT[7];
        if (id === 'genki_no_kakato') return '防御力と移動速度が上昇。';
        if (id === 'genbu_kourin') return '周囲の敵を圧倒する衝撃波を放つ。';
        if (id === 'ice_genbu') return '氷の力と玄武の防御が融合した究極技。';
    } catch (e) { }
    return '能力が強化される。または新しい技を取得する。';
}

function levelUp() {
    isPaused = true;
    playerLevel++; currentExp -= maxExp; maxExp = Math.floor(maxExp * 1.5);

    let upgradePool = [];

    // --- 合成技判定 ---

    // 【氷の玄武】: 玄亀の踵 と 氷系を両方持っていれば低確率(5%)で出現 (Lv1~Lv7対応)
    const hasGenki = activeSkills['genki_no_kakato'];
    const hasIce = activeSkills['ice_barrage'] || activeSkills['frost_storm'];
    if (hasGenki && hasIce && !activeSkills['ice_genbu']) {
        if (Math.random() < 0.05) {
            upgradePool.push({ id: 'ice_genbu', branch: null, level: 7, name: '氷の玄武', desc: getSkillDescription('ice_genbu', 7), image: 'image/icon/氷の玄武.png', requiresBranch: false });
        }
    }

    // 【光影の識別】
    if (activeSkills['crimson_barrier'] && activeSkills['holy_punishment'] && !activeSkills['fusion_light_shadow']) {
        if (Math.random() < 0.1) {
            upgradePool.push({ id: 'fusion_light_shadow', branch: null, level: 7, name: '光影の識別', desc: getSkillDescription('fusion_light_shadow', 7), image: 'image/icon/光影の識別.png', requiresBranch: false });
        }
    }

    // 【絶・氷点】
    if (!activeSkills['absolute_zero'] && Math.random() < 0.03) {
        upgradePool.push({ id: 'absolute_zero', branch: null, level: 7, name: '絶・氷点', desc: getSkillDescription('absolute_zero', 7), image: 'image/icon/絶・氷点.png', requiresBranch: false });
    }

    for (let baseSkill of availableSkills) {
        if (activeSkills['fusion_light_shadow'] && (baseSkill.id === 'crimson_barrier' || baseSkill.id === 'holy_punishment')) continue;
        if (activeSkills['ice_genbu'] && (baseSkill.id === 'genki_no_kakato' || baseSkill.id === 'ice_barrage' || baseSkill.id === 'frost_storm')) continue;

        let active = activeSkills[baseSkill.id]; let nextLevel = active ? active.level + 1 : 1;
        if (nextLevel > 7) continue;

        let requiresBranch = ['punishment', 'crimson_barrier', 'vampire', 'wrath_of_god', 'holy_punishment', 'frost_storm', 'ice_barrage'].includes(baseSkill.id) && (nextLevel === 4 || nextLevel === 7);
        upgradePool.push({ id: baseSkill.id, branch: null, level: nextLevel, name: baseSkill.name, desc: getSkillDescription(baseSkill.id, nextLevel), image: baseSkill.image, requiresBranch: requiresBranch });
    }

    if (upgradePool.length === 0) {
        UI.updateExp(currentExp, maxExp, playerLevel); isPaused = false; requestAnimationFrame(gameLoop); return;
    }

    const shuffled = upgradePool.sort(() => 0.5 - Math.random());
    const selectedSkills = shuffled.slice(0, 3);

    UI.showSkillSelection(selectedSkills, (skill) => {
        if (skill.requiresBranch) {
            let branches = [];
            try {
                if (skill.id === 'vampire' && skill.level === 4) branches = [{ id: 'fatal_kin', name: VAMPIRE_TEXT[4].fatal_kin.name, desc: VAMPIRE_TEXT[4].fatal_kin.desc, image: skill.image }, { id: 'blood_armor', name: VAMPIRE_TEXT[4].blood_armor.name, desc: VAMPIRE_TEXT[4].blood_armor.desc, image: skill.image }];
                else if (skill.id === 'vampire' && skill.level === 7) branches = [{ id: 'calm_drain', name: VAMPIRE_TEXT[7].calm_drain.name, desc: VAMPIRE_TEXT[7].calm_drain.desc, image: skill.image }, { id: 'blood_trail', name: VAMPIRE_TEXT[7].blood_trail.name, desc: VAMPIRE_TEXT[7].blood_trail.desc, image: skill.image }];
                else if (skill.id === 'punishment' && skill.level === 4) branches = [{ id: 'humiliate', name: PUNISHMENT_TEXT[4].humiliate.name, desc: PUNISHMENT_TEXT[4].humiliate.desc, image: skill.image }, { id: 'pleasure', name: PUNISHMENT_TEXT[4].pleasure.name, desc: PUNISHMENT_TEXT[4].pleasure.desc, image: skill.image }];
                else if (skill.id === 'punishment' && skill.level === 7) branches = [{ id: 'blood', name: PUNISHMENT_TEXT[7].blood.name, desc: PUNISHMENT_TEXT[7].blood.desc, image: skill.image }, { id: 'infinite', name: PUNISHMENT_TEXT[7].infinite.name, desc: PUNISHMENT_TEXT[7].infinite.desc, image: skill.image }];
                else if (skill.id === 'crimson_barrier' && skill.level === 4) branches = [{ id: 'blood_erosion', name: CRIMSON_BARRIER_TEXT[4].blood_erosion.name, desc: CRIMSON_BARRIER_TEXT[4].blood_erosion.desc, image: skill.image }, { id: 'blood_festival', name: CRIMSON_BARRIER_TEXT[4].blood_festival.name, desc: CRIMSON_BARRIER_TEXT[4].blood_festival.desc, image: skill.image }];
                else if (skill.id === 'crimson_barrier' && skill.level === 7) branches = [{ id: 'blood_pact', name: CRIMSON_BARRIER_TEXT[7].blood_pact.name, desc: CRIMSON_BARRIER_TEXT[7].blood_pact.desc, image: skill.image }, { id: 'crimson_offense', name: CRIMSON_BARRIER_TEXT[7].crimson_offense.name, desc: CRIMSON_BARRIER_TEXT[7].crimson_offense.desc, image: skill.image }];
                else if (skill.id === 'wrath_of_god' && skill.level === 4) branches = [{ id: 'super_skill', name: WRATH_OF_GOD_TEXT[4].super_skill.name, desc: WRATH_OF_GOD_TEXT[4].super_skill.desc, image: skill.image }, { id: 'dazzling_light', name: WRATH_OF_GOD_TEXT[4].dazzling_light.name, desc: WRATH_OF_GOD_TEXT[4].dazzling_light.desc, image: skill.image }];
                else if (skill.id === 'wrath_of_god' && skill.level === 7) branches = [{ id: 'genesis_light', name: WRATH_OF_GOD_TEXT[7].genesis_light.name, desc: WRATH_OF_GOD_TEXT[7].genesis_light.desc, image: skill.image }, { id: 'heavenly_army', name: WRATH_OF_GOD_TEXT[7].heavenly_army.name, desc: WRATH_OF_GOD_TEXT[7].heavenly_army.desc, image: skill.image }];
                else if (skill.id === 'holy_punishment' && skill.level === 4) branches = [{ id: 'divine_protection', name: HOLY_PUNISHMENT_TEXT[4].divine_protection.name, desc: HOLY_PUNISHMENT_TEXT[4].divine_protection.desc, image: skill.image }, { id: 'fury_of_the_sun', name: HOLY_PUNISHMENT_TEXT[4].fury_of_the_sun.name, desc: HOLY_PUNISHMENT_TEXT[4].fury_of_the_sun.desc, image: skill.image }];
                else if (skill.id === 'holy_punishment' && skill.level === 7) branches = [{ id: 'unforgiven_decree', name: HOLY_PUNISHMENT_TEXT[7].unforgiven_decree.name, desc: HOLY_PUNISHMENT_TEXT[7].unforgiven_decree.desc, image: skill.image }, { id: 'silence', name: HOLY_PUNISHMENT_TEXT[7].silence.name, desc: HOLY_PUNISHMENT_TEXT[7].silence.desc, image: skill.image }];
                else if (skill.id === 'frost_storm' && skill.level === 4) branches = [{ id: 'bone_chilling', name: FROST_STORM_TEXT[4].bone_chilling.name, desc: FROST_STORM_TEXT[4].bone_chilling.desc, image: skill.image }, { id: 'vortex', name: FROST_STORM_TEXT[4].vortex.name, desc: FROST_STORM_TEXT[4].vortex.desc, image: skill.image }];
                else if (skill.id === 'frost_storm' && skill.level === 7) branches = [{ id: 'absolute_zero', name: FROST_STORM_TEXT[7].absolute_zero.name, desc: FROST_STORM_TEXT[7].absolute_zero.desc, image: skill.image }, { id: 'ice_swords', name: FROST_STORM_TEXT[7].ice_swords.name, desc: FROST_STORM_TEXT[7].ice_swords.desc, image: skill.image }];
                else if (skill.id === 'ice_barrage' && skill.level === 4) branches = [{ id: 'spiral_frost', name: ICE_BARRAGE_TEXT[4].spiral_frost.name, desc: ICE_BARRAGE_TEXT[4].spiral_frost.desc, image: skill.image }, { id: 'great_freeze', name: ICE_BARRAGE_TEXT[4].great_freeze.name, desc: ICE_BARRAGE_TEXT[4].great_freeze.desc, image: skill.image }];
                else if (skill.id === 'ice_barrage' && skill.level === 7) branches = [{ id: 'absolute_collapse', name: ICE_BARRAGE_TEXT[7].absolute_collapse.name, desc: ICE_BARRAGE_TEXT[7].absolute_collapse.desc, image: skill.image }, { id: 'death_domain', name: ICE_BARRAGE_TEXT[7].death_domain.name, desc: ICE_BARRAGE_TEXT[7].death_domain.desc, image: skill.image }];
            } catch (e) { }

            if (branches.length > 0) UI.showBranchSelection(branches, (branchId) => { applySkillUpgrade(skill, branchId); });
            else applySkillUpgrade(skill, null);
        } else {
            applySkillUpgrade(skill, null);
        }
    });

    function applySkillUpgrade(skill, branchId) {
        if (!activeSkills[skill.id]) {
            let instance = createSkillInstance(skill.id);
            if (instance) activeSkills[skill.id] = instance;
        } else {
            if (typeof activeSkills[skill.id].levelUp === 'function') activeSkills[skill.id].levelUp(branchId);
            else activeSkills[skill.id].level++;
        }

        // 合成時の素材削除
        if (skill.id === 'ice_genbu') {
            delete activeSkills['genki_no_kakato'];
            delete activeSkills['ice_barrage'];
            delete activeSkills['frost_storm'];
        }

        if (skill.id === 'fusion_light_shadow') {
            delete activeSkills['crimson_barrier']; delete activeSkills['holy_punishment'];
            enemies.forEach(e => {
                if (e.isSlowedByHolySeal) { e.speed = e.originalSpeed || e.speed; e.isSlowedByHolySeal = false; }
                if (e.isStunnedByCrimson) { e.speed = e.originalSpeed || e.speed; e.isStunnedByCrimson = false; }
            });
        }

        UI.updateExp(currentExp, maxExp, playerLevel);
        isPaused = false;
        requestAnimationFrame(gameLoop);
    }
}

// ★負荷対策：ジェムが上限に達した場合、一番古いジェムを削除し、その経験値を新しいジェムに引き継ぐ
function spawnExpGem(x, y, amount) {
    let gemAmount = amount || 10;

    // ジェムの総数が上限に達した場合の処理
    if (expGems.length >= MAX_GEMS_LIMIT) {
        let pooledExp = 0;
        let deletedCount = 0;

        // 画面の半分（カメラの描画範囲）に少し余裕を持たせた判定距離
        const margin = 150; 
        const limitX = width / 2 + margin;
        const limitY = height / 2 + margin;

        // 配列の後ろ（古いジェム）からスキャンして画面外のものを削除
        for (let i = 0; i < expGems.length; i++) {
            const gem = expGems[i];
            const dx = Math.abs(player.x - gem.x);
            const dy = Math.abs(player.y - gem.y);

            // プレイヤーから見て画面外にいるか判定
            if (dx > limitX || dy > limitY) {
                pooledExp += (gem.amount || 5); // 経験値をプール
                expGems.splice(i, 1);           // 配列から削除
                i--;                            // インデックス調整
                deletedCount++;

                // 負荷対策：1回のスポーンにつき最大20個まで一気に削除して隙間を作る
                if (deletedCount >= 20) break;
            }
        }

        // もし画面外にジェムが一つもなかった場合（画面内が3000個で埋まった場合）
        // 一番古いジェムを消して、その経験値を引き継ぐ
        if (deletedCount === 0) {
            let oldGem = expGems.shift();
            pooledExp += (oldGem.amount || 5);
        }

        // 削除した分の経験値を、今から生成するジェムに合算
        gemAmount += pooledExp;
    }

    // 新しいジェムを生成（ExpGemクラスが存在することを確認）
    if (typeof ExpGem !== 'undefined') {
        expGems.push(new ExpGem(x, y, gemAmount));
    }
}

function update() {
    if (isPaused) return;

    if (player.hp <= 0 && player.state !== 'death') {
        player.state = 'death';
        showGameOver(); // 下記で追加する関数を呼び出す
        return;
    } else if (player.state === 'death') {
        return; // 死亡演出後は以降の処理（敵の移動等）をすべて止める
    }
    // タイムカウントとUI更新
    frameCount++;
    if (frameCount % 60 === 0) {
        gameTime++;
        const timeText = document.getElementById('time-text');
        if (timeText) {
            let m = Math.floor(gameTime / 60).toString().padStart(2, '0');
            let s = (gameTime % 60).toString().padStart(2, '0');
            timeText.innerText = `${m}:${s}`;
        }
    }

    // 敵のスポーン（出現）処理
    spawnTimer++;
    let spawnInterval = Math.max(5, 60 - Math.floor(gameTime / 3));
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        let spawnCount = 1 + Math.floor(gameTime / 15);
        for (let i = 0; i < spawnCount; i++) {
            if (typeof spawnEnemy === 'function') spawnEnemy();
        }
    }

    // 入力とプレイヤー移動
    let moveDir = UniversalInput.getVelocity();
    player.update(moveDir.vx, moveDir.vy, width, height);

    // 攻撃とスキルの更新
    if (typeof processBasicAttack === 'function') processBasicAttack();
    Object.values(activeSkills).forEach(skill => {
        try { if (skill.update) skill.update(); } catch (e) { }
    });

    // 敵の更新・死亡判定
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (e.update) e.update(player.x, player.y);
        
        // プレイヤーへの接触ダメージ
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.radius + (e.radius || 10)) {
            if (typeof damagePlayer === 'function') damagePlayer(5);
        }

        // 死亡時のジェムドロップ
        if (e.hp <= 0) {
            spawnExpGem(e.x, e.y, e.exp); 
            enemies.splice(i, 1);
            continue;
        }
    }

    // 強制リミッター：ここでのカットはもう不要だが安全のため
    if (expGems.length > MAX_GEMS_LIMIT) {
        expGems.splice(MAX_GEMS_LIMIT); 
    }

    // 毒沼・弾・エフェクト（メモリリーク対策）
    if (typeof poisonFields !== 'undefined') {
        for (let i = poisonFields.length - 1; i >= 0; i--) {
            let field = poisonFields[i];
            if (field.update) field.update();
            if (field.life <= 0) poisonFields.splice(i, 1);
        }
    }
    if (typeof enemyProjectiles !== 'undefined') {
        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            let proj = enemyProjectiles[i];
            if (proj.update) proj.update();
            if (proj.life <= 0) enemyProjectiles.splice(i, 1);
        }
    }
    for (let i = basicAttacks.length - 1; i >= 0; i--) {
        basicAttacks[i].life--;
        if (basicAttacks[i].life <= 0) basicAttacks.splice(i, 1);
    }

    // 経験値ジェムの回収（磁力）とレベルアップ
    let shouldLevelUp = false;
    for (let i = expGems.length - 1; i >= 0; i--) {
        let gem = expGems[i];
        let dx = player.x - gem.x, dy = player.y - gem.y;
        
        // ★負荷対策：遠すぎるジェムは計算をスキップ
        if (Math.abs(dx) > 200 || Math.abs(dy) > 200) continue;

        let dist = Math.hypot(dx, dy);

        if (dist < 180) { // 磁力吸引
            gem.x += (dx / dist) * 9; gem.y += (dy / dist) * 9;
            dist = Math.hypot(player.x - gem.x, player.y - gem.y);
        }
        if (dist < player.radius + (gem.radius || 5) + 30) {
            currentExp += (gem.amount || 5);
            expGems.splice(i, 1); // 取得
            if (currentExp >= maxExp) shouldLevelUp = true;
            else if (!shouldLevelUp && typeof UI !== 'undefined') UI.updateExp(currentExp, maxExp, playerLevel);
        }
    }
    if (shouldLevelUp) levelUp();
}

// 描画関数を1つに統合しました
function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    const cameraX = width / 2 - player.x;
    const cameraY = height / 2 - player.y;
    ctx.translate(cameraX, cameraY);

    // ★負荷対策：画面外のオブジェクトを描画しない（カリング）
    const margin = 150;
    const isVisible = (ox, oy) => {
        return ox >= player.x - width / 2 - margin &&
               ox <= player.x + width / 2 + margin &&
               oy >= player.y - height / 2 - margin &&
               oy <= player.y + height / 2 + margin;
    };

    // === 無限背景画像タイリング ===
    if (bgImage.complete && bgImage.naturalWidth > 0) {
        // ★負荷対策：画像サイズが小さすぎる場合の無限ループによるフリーズを防止
        const bgW = Math.max(bgImage.width, 100);
        const bgH = Math.max(bgImage.height, 100);

        let startX = Math.floor((player.x - width / 2) / bgW) * bgW;
        let startY = Math.floor((player.y - height / 2) / bgH) * bgH;

        for (let x = startX; x < startX + width + bgW; x += bgW) {
            for (let y = startY; y < startY + height + bgH; y += bgH) {
                ctx.drawImage(bgImage, x, y, bgW, bgH);
            }
        }
    } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        let gridSize = 100;
        let sX = Math.floor((player.x - width / 2) / gridSize) * gridSize;
        let sY = Math.floor((player.y - height / 2) / gridSize) * gridSize;
        for (let x = sX; x <= sX + width + gridSize; x += gridSize) { ctx.moveTo(x, sY); ctx.lineTo(x, sY + height + gridSize); }
        for (let y = sY; y <= sY + height + gridSize; y += gridSize) { ctx.moveTo(sX, y); ctx.lineTo(sX + width + gridSize, y); }
        ctx.stroke();
    }

    // 毒沼の描画
    if (typeof poisonFields !== 'undefined') {
        poisonFields.forEach(field => { 
            if (isVisible(field.x, field.y) && field.draw) field.draw(ctx); 
        });
    }

    expGems.forEach(gem => {
        if (!isVisible(gem.x, gem.y)) return;
        if (gem.draw) gem.draw(ctx);
        else { ctx.beginPath(); ctx.arc(gem.x, gem.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#00ffff'; ctx.fill(); }
    });

    basicAttacks.forEach(atk => {
        if (!isVisible(atk.x, atk.y)) return;
        ctx.beginPath(); ctx.arc(atk.x, atk.y, 25 - atk.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${atk.life / 10})`; ctx.fill();
    });

    Object.values(activeSkills).forEach(skill => {
        try { if (skill.draw) skill.draw(ctx); } catch (e) { }
    });

    enemies.forEach(e => { 
        if (isVisible(e.x, e.y) && e.draw) e.draw(ctx); 
    });

    // 敵の弾の描画
    if (typeof enemyProjectiles !== 'undefined') {
        enemyProjectiles.forEach(proj => { 
            if (isVisible(proj.x, proj.y) && proj.draw) proj.draw(ctx); 
        });
    }

    player.draw(ctx);

    ctx.restore();

    // エラー表示処理
    if (gameErrors.length > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "red"; ctx.font = "bold 16px sans-serif";
        ctx.fillText("⚠️ エラーが発生しました。以下の文字をコピペまたはスクショして教えてください。", 20, 40);
        for (let i = 0; i < Math.min(gameErrors.length, 15); i++) { ctx.fillText(gameErrors[i], 20, 80 + i * 25); }
    }
}

function gameLoop() {
    update(); draw();
    if (!isPaused) requestAnimationFrame(gameLoop);
}

if (typeof UI !== 'undefined' && UI.startScreen) {
    UI.startScreen.addEventListener('click', () => {
        if (isStarted) return;
        isStarted = true; isPaused = false;
        UI.startScreen.classList.add('hidden');
        initGame();
        requestAnimationFrame(gameLoop);
    });
}

const pauseBtn = document.getElementById('pause-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const saveQuitBtn = document.getElementById('save-quit-btn');
const quitBtn = document.getElementById('quit-btn');

if (quitBtn) {
    quitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // 1. セーブデータを完全に削除 (localStorageから削除)
        localStorage.removeItem('survivorSaveData');
        console.log("🧹 すべてのセーブデータを削除しました");

        if (player) {
            // 2. 強制的に死亡状態にする
            player.hp = 0;
            
            // 3. UIを閉じてゲームを動かす（これで死亡判定が走り、ゲームオーバー画面へ行く）
            if (pauseScreen) pauseScreen.classList.add('hidden');
            isPaused = false;
            requestAnimationFrame(gameLoop);
        }
    });
}

if (pauseBtn) {
    pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); isPaused = true;
        if (pauseScreen) pauseScreen.classList.remove('hidden');
        if (typeof saveGameData === 'function') saveGameData();
    });
}
if (resumeBtn) {
    resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); if (pauseScreen) pauseScreen.classList.add('hidden');
        isPaused = false; requestAnimationFrame(gameLoop);
    });
}
if (saveQuitBtn) {
    saveQuitBtn.addEventListener('click', (e) => {
        e.stopPropagation(); if (typeof saveGameData === 'function') saveGameData();
        location.reload();
    });
}

// ==========================================
// ★スキル確認機能
// ==========================================
const skillBookIcon = document.getElementById('skill-book-icon');
const activeSkillsScreen = document.getElementById('active-skills-screen');
const closeSkillsBtn = document.getElementById('close-skills-btn');
const activeSkillsContainer = document.getElementById('active-skills-container');

if (skillBookIcon) {
    skillBookIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const startScreen = document.getElementById('start-screen');
        // ゲームスタート前は開けない
        if (startScreen && !startScreen.classList.contains('hidden')) return;

        // 時間を止める
        isPaused = true;

        // 取得スキルのリストを生成
        activeSkillsContainer.innerHTML = '';
        const keys = Object.keys(activeSkills);

        if (keys.length === 0) {
            activeSkillsContainer.innerHTML = '<p style="color: #aaa; font-size: 16px; margin-top: 20px;">まだスキルを取得していません</p>';
        } else {
            keys.forEach(key => {
                const skillInst = activeSkills[key];
                const baseSkill = availableSkills.find(s => s.id === key);
                
                let name = key;
                let image = 'image/icon/book.png';
                let level = skillInst.level;

                if (baseSkill) {
                    name = baseSkill.name;
                    image = baseSkill.image;
                } else {
                    // 合成スキルなど、availableSkillsにない場合のハードコード対応
                    const extraSkills = {
                        'fusion_light_shadow': { name: '光影の識別', image: 'image/icon/光影の識別.png' },
                        'absolute_zero': { name: '絶・氷点', image: 'image/icon/絶・氷点.png' },
                        'ice_genbu': { name: '氷の玄武', image: 'image/icon/氷の玄武.png' }
                    };
                    if (extraSkills[key]) {
                        name = extraSkills[key].name;
                        image = extraSkills[key].image;
                    }
                }

                const card = document.createElement('div');
                card.className = 'active-skill-card';
                card.innerHTML = `
                    <img src="${image}" alt="${name}" onerror="this.src='image/icon/book.png'">
                    <div class="name">${name}</div>
                    <div class="level">Lv.${level >= 7 ? 'MAX' : level}</div>
                `;
                activeSkillsContainer.appendChild(card);
            });
        }
        
        activeSkillsScreen.classList.remove('hidden');
    });
}

if (closeSkillsBtn) {
    closeSkillsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeSkillsScreen.classList.add('hidden');
        
        // 他の画面（レベルアップ選択、一時停止など）が開いていない場合のみゲームを再開する
        const isOtherScreenOpen = 
            (!document.getElementById('skill-selection-screen').classList.contains('hidden')) || 
            (!document.getElementById('branch-selection-screen').classList.contains('hidden')) ||
            (!document.getElementById('pause-screen').classList.contains('hidden'));
        
        if (!isOtherScreenOpen) {
            isPaused = false; 
            requestAnimationFrame(gameLoop);
        }
    });
}
// ==========================================
// ★ゲームオーバー処理
// ==========================================
function showGameOver() {
    isPaused = true;
    
    // 死亡したためセーブデータを削除
    localStorage.removeItem('survivorSaveData');

    // ゲームオーバー画面を表示し、最終スコアを反映
    const gameOverScreen = document.getElementById('game-over-screen');
    const survivalTimeText = document.getElementById('survival-time-text');
    if (gameOverScreen && survivalTimeText) {
        let m = Math.floor(gameTime / 60).toString().padStart(2, '0');
        let s = (gameTime % 60).toString().padStart(2, '0');
        survivalTimeText.innerHTML = `生存時間: <span style="color:#fff;">${m}:${s}</span><br><br>到達Lv: <span style="color:#ffd700;">${playerLevel}</span>`;
        gameOverScreen.classList.remove('hidden');
    }
}

// リスタート（タイトルへ戻る）ボタンのイベント
const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        location.reload(); // リロードして初期状態へ
    });
}