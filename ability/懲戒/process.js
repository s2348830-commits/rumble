class Thorn {
    constructor(skill, id, version) {
        this.skill = skill;
        this.id = id;
        this.version = version;
        this.reset();
    }

    reset() {
        this.active = true;
        this.restarting = false;
        this.x = player.x;
        this.y = player.y;
        this.traveled = 0; 
        
        // 発射方向を分散（1本の場合はランダム方向）
        let angleOffset = (Math.PI * 2 / this.skill.thornCount) * this.id;
        this.angle = angleOffset + (this.skill.thornCount === 1 ? Math.random() * Math.PI * 2 : 0);
        
        this.spiralTimer = 0;
        this.damageCooldowns = new Map();

        this.points = [{x: this.x, y: this.y, w: this.skill.weight, angle: this.angle}];
        this.target = null;
        
        if (this.skill.level >= 7 && this.skill.evo7 === "blood") {
            this.maxLength = 50; 
        } else {
            this.maxLength = 1000;
        }
    }

    findTarget() {
        let minDist = Infinity;
        let newTarget = null;
        enemies.forEach(e => {
            if (this.skill.level >= 7 && this.skill.evo7 === "blood" && this.skill.phase === "ATTACK") {
                // 血罪狂宴のカウンター攻撃：至近距離の敵のみを狙う
                if (e.targetedBy == null || e.targetedBy === this.id) {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < 150 && d < minDist) { minDist = d; newTarget = e; }
                }
            } else if (this.skill.level >= 7 && this.skill.evo7 === "infinite") {
                // 無限奥義：同じ敵に複数の茨が被らないようにロックオン
                if (e.targetedBy == null || e.targetedBy === this.id) {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < minDist) { minDist = d; newTarget = e; }
                }
            } else {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < minDist) { minDist = d; newTarget = e; }
            }
        });

        if (this.skill.level >= 7) {
            if (this.target) this.target.targetedBy = null;
            this.target = newTarget;
            if (this.target) this.target.targetedBy = this.id;
        } else {
            this.target = newTarget;
        }
    }

    update(pdx, pdy) {
        if (!this.active) return;

        // プレイヤーの移動に合わせて茨全体をスライド（置き去り防止）
        this.x += pdx;
        this.y += pdy;
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].x += pdx;
            this.points[i].y += pdy;
        }

        // 血罪狂宴のATTACK（射出）時以外は、根元をプレイヤー座標に固定
        if (this.points.length > 0 && !(this.skill.level >= 7 && this.skill.evo7 === "blood" && this.skill.phase === "ATTACK")) {
            this.points[0].x = player.x;
            this.points[0].y = player.y;
        }

        if (this.skill.level >= 7 && this.skill.evo7 === "blood") {
            if (this.skill.phase === "ORBIT") {
                // 血罪狂宴(ORBIT): 回転半径が小さく、回転速度が倍増
                this.angle += 0.16;
                const orbitR = 30 + Math.sin(Date.now() * 0.01) * 10;
                this.x = player.x + Math.cos(this.angle + (this.id * 2)) * orbitR;
                this.y = player.y + Math.sin(this.angle + (this.id * 2)) * orbitR;
                this.maxLength = 30;
                this.traveled = 0; 
                
                this.points.push({x: this.x, y: this.y, w: this.skill.weight, angle: this.angle});
                if (this.points.length > this.maxLength) this.points.shift();
                
                // 回転中も近付く敵を弾き飛ばす判定
                this.checkCollision(this.x, this.y, 35); 
                return; 
            } else {
                // 血罪狂宴(ATTACK): 至近距離への超高速射出
                this.maxLength = 500;
                if (!this.target || !enemies.includes(this.target)) {
                    this.findTarget();
                }
            }
        } else {
            if (!this.target || !enemies.includes(this.target)) {
                this.findTarget();
            }
        }

        let targetAngle = this.angle;
        if (this.target) {
            targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * this.skill.turnSpeed;
        } else {
            this.angle += Math.sin(Date.now() * 0.01) * 0.05;
        }

        let moveX = Math.cos(this.angle) * this.skill.speed;
        let moveY = Math.sin(this.angle) * this.skill.speed;

        // Lv4: 罪の快感 (螺旋軌道で進む)
        if (this.skill.level >= 4 && this.skill.evo4 === "pleasure") {
            this.spiralTimer += 0.3;
            let spiralForce = Math.cos(this.spiralTimer) * 8; 
            moveX += Math.cos(this.angle + Math.PI/2) * spiralForce;
            moveY += Math.sin(this.angle + Math.PI/2) * spiralForce;
        }

        this.x += moveX;
        this.y += moveY;
        this.traveled += this.skill.speed;

        if (this.traveled >= this.skill.maxDist) {
            this.active = false;
        }
        
        this.points.push({x: this.x, y: this.y, w: this.skill.weight, angle: this.angle});
        if (this.points.length > this.maxLength) this.points.shift();

        // 先端の当たり判定
        this.checkCollision(this.x, this.y, 25);

        // Lv7 無限奥義: 通った軌跡全体に攻撃判定を残す
        if (this.skill.level >= 7 && this.skill.evo7 === "infinite") {
            for (let i = 0; i < this.points.length; i += 10) {
                this.checkCollision(this.points[i].x, this.points[i].y, 15, true);
            }
        }

        if (Math.abs(this.x - player.x) > width + 400 || Math.abs(this.y - player.y) > height + 400) {
            this.active = false;
        }
    }

    checkCollision(cx, cy, radius, isTrail = false) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            
            // 軌跡の攻撃判定の場合、同じ敵に連続ヒットしないようクールダウンを設ける
            if (isTrail) {
                const lastHit = this.damageCooldowns.get(e);
                if (lastHit && Date.now() - lastHit < 500) continue; 
            }

            if (Math.hypot(e.x - cx, e.y - cy) < radius + e.radius) {
                this.skill.killEnemy(e);
                if (isTrail) {
                    this.damageCooldowns.set(e, Date.now());
                } else {
                    break;
                }
            }
        }
    }

    draw(ctx) {
        if (!this.active || this.points.length < 2) return;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < this.points.length; i++) {
            const p1 = this.points[i-1];
            const p2 = this.points[i];
            
            const progress = i / this.points.length;
            
            // Lv6以降で光の演出(shadowBlur)と色を強化
            let shadowBlurBase = this.skill.level >= 6 ? 25 : 15;
            ctx.shadowBlur = shadowBlurBase * (0.5 + progress * 0.5);
            ctx.shadowColor = this.skill.level >= 6 ? "#b800e6" : "#8a2be2";
            
            let colorVal1 = Math.floor(20 + progress * 80);
            let colorVal2 = Math.floor(40 + progress * 160);
            if (this.skill.level >= 6) {
                colorVal1 += 20; colorVal2 += 40; 
            }
            
            ctx.strokeStyle = `rgb(${colorVal1}, 0, ${colorVal2})`;
            ctx.lineWidth = p2.w;
            
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            
            if (i % 6 === 0) {
                const side = (i % 12 === 0) ? 1 : -1;
                this.drawThornSpike(ctx, p2.x, p2.y, p2.angle, side, "#15002b");
            }
        }
        ctx.shadowBlur = 0;
    }

    drawThornSpike(ctx, x, y, angle, side, color) {
        ctx.save();
        ctx.translate(x, y);
        
        let angleOffset = Math.PI / 1.7;
        let size = this.skill.spikeSize;
        
        ctx.rotate(angle + angleOffset * side);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(6 * size, 6 * side * size, 0, 20 * side * size);
        ctx.lineTo(-4 * size, 4 * side * size);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }
}

class PunishmentSkill {
    constructor() {
        this.level = 1;
        this.version = 1;
        this.thorns = [];
        this.phase = "ORBIT"; 
        this.phaseTimer = Date.now();
        this.lastPlayerX = player.x;
        this.lastPlayerY = player.y;

        this.evo4 = null; 
        this.evo7 = null; 

        this.updateStats();
        this.initThorns();
    }

    updateStats() {
        // 基本ステータス
        this.thornCount = 1;
        this.reloadTime = 1000;
        this.weight = 4;
        this.spikeSize = 1.0;
        this.turnSpeed = 0.25;
        this.speed = 12;
        this.maxDist = 700;

        if (this.level >= 2) {
            this.thornCount = 2;
            this.reloadTime = 800;
        }
        if (this.level >= 3) {
            this.weight = 6;
            this.spikeSize = 1.5;
            this.turnSpeed = 0.35;
        }
        if (this.level >= 4) {
            if (this.evo4 === "humiliate") {
                this.thornCount = 3; // 屈辱懲戒: 3本
            } else if (this.evo4 === "pleasure") {
                this.thornCount = 2; // 罪の快感: 螺旋(本数は2本のまま)
            }
        }
        if (this.level >= 5) {
            this.speed = 18;
            this.reloadTime = 600;
        }
        if (this.level >= 6) {
            this.maxDist *= 1.2; // 射程20%延長
        }
        if (this.level >= 7) {
            if (this.evo7 === "infinite") {
                this.thornCount = 5;
                this.phase = "ATTACK"; // 無限奥義はORBIT廃止
            }
        }
    }
    
    initThorns() {
        this.thorns = [];
        for (let i = 0; i < this.thornCount; i++) {
            this.thorns.push(new Thorn(this, i, this.version));
        }
    }

    // UIで選択された分岐(branch)を受け取って進化
    levelUp(branch) {
        this.level++;
        this.version++;
        if (this.level === 4 && branch) this.evo4 = branch;
        if (this.level === 7 && branch) this.evo7 = branch;

        this.updateStats();
        
        this.initThorns();
        if (this.level >= 7 && this.evo7 === "blood") {
            this.phase = "ORBIT";
            this.phaseTimer = Date.now();
        }
    }

    killEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            expGems.push(new ExpGem(enemy.x, enemy.y, 5));
            enemies.splice(index, 1);
        }
    }

    update() {
        const pdx = player.x - this.lastPlayerX;
        const pdy = player.y - this.lastPlayerY;
        this.lastPlayerX = player.x;
        this.lastPlayerY = player.y;

        if (this.level >= 7 && this.evo7 === "blood") {
            const now = Date.now();
            if (this.phase === "ORBIT") {
                // 敵が極端に接近したかチェック (カウンター条件)
                let isEnemyClose = enemies.some(e => Math.hypot(e.x - player.x, e.y - player.y) < 150);
                if (isEnemyClose) { 
                    this.phase = "ATTACK";
                }
            } else if (this.phase === "ATTACK") {
                const allDone = this.thorns.every(t => !t.active);
                if (allDone) {
                    this.phase = "ORBIT";
                    this.phaseTimer = now;
                    this.thorns.forEach(t => t.reset());
                    enemies.forEach(e => e.targetedBy = null);
                }
            }
        } else if (this.level >= 7 && this.evo7 === "infinite") {
            this.phase = "ATTACK";
        }

        this.thorns.forEach(t => {
            if (t.active) {
                t.update(pdx, pdy);
            } else {
                if (!t.restarting) {
                    t.restarting = true;
                    // 再発射までのクールダウン
                    setTimeout(() => {
                        if (this.version === t.version) t.reset();
                    }, this.reloadTime);
                }
            }
        });
    }

    draw(ctx) {
        this.thorns.forEach(t => t.draw(ctx));
    }
}