const VAMPIRE_THEME_COLOR = "#ff1a1a";

class VampireParticle {
    constructor(skill, x, y, color, speedFactor = 1, isDamageTrail = false) {
        this.skill = skill;
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 2 * speedFactor;
        this.vy = (Math.random() - 0.5) * 2 * speedFactor;
        this.life = 1.0;
        this.size = Math.random() * 2 + 1;
        this.color = color;
        this.isDamageTrail = isDamageTrail; // Lv7 血の軌跡用
        this.hitCooldowns = new Map();
    }

    update() {
        this.x += this.vx; 
        this.y += this.vy;
        this.life -= 0.025;

        // 軌跡のダメージ判定 (血の軌跡用)
        if (this.isDamageTrail && this.life > 0) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (Math.hypot(e.x - this.x, e.y - this.y) < this.size + e.radius) {
                    const lastHit = this.hitCooldowns.get(e);
                    if (!lastHit || Date.now() - lastHit > 500) {
                        this.skill.killEnemy(e);
                        this.hitCooldowns.set(e, Date.now());
                    }
                }
            }
        }
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        if (this.isDamageTrail) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = this.color;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

class VampireBat {
    constructor(skill, index, totalBats) {
        this.skill = skill;
        this.index = index;
        this.x = player.x;
        this.y = player.y;
        this.angle = (Math.PI * 2 / totalBats) * index;
        this.orbitRadius = 75 + (index % 3) * 10;
        this.state = 'orbit';
        this.target = null;
        this.timer = Math.random() * 100;
        this.speedBoostTimer = 0; // Lv5 吸血加速用
    }

    get baseSpeed() {
        return this.skill.level >= 2 ? 16 : 14; // Lv2で14→16に向上
    }

    get orbitMultiplier() {
        if (this.skill.level >= 7 && this.skill.evo7 === "calm_drain") {
            return 0.5; // Lv7 泰然自若: 至近距離
        }
        if (this.skill.level >= 4 && this.skill.evo4 === "fatal_kin") {
            return 1.5; // Lv4 致命な眷属: 公転半径拡大
        }
        return 1.0;
    }

    get attackRate() {
        if (this.skill.level >= 7 && this.skill.evo7 === "blood_trail") {
            return 1.0; // Lv7 血の軌跡: 常に敵を追いかける
        }
        if (this.skill.level >= 7 && this.skill.evo7 === "calm_drain") {
            return 0; // Lv7 泰然自若: 自分からは追いかけない
        }
        return this.skill.level >= 6 ? 0.1 : 0.05;
    }

    get hitRadius() {
        return this.skill.level >= 6 ? 25 : 15; // Lv6 コウモリ巨大化
    }

    findUniqueTarget() {
        if (enemies.length === 0) return null;
        let availableEnemies = enemies.filter(e => !e.targetedByVampire);
        if (availableEnemies.length === 0) return null;

        if (this.skill.level >= 3) {
            // Lv3 索敵AIの強化: detectionRadius内を優先
            const inFieldEnemies = availableEnemies.filter(e => {
                const dist = Math.hypot(e.x - player.x, e.y - player.y);
                return dist <= this.skill.detectionRadius;
            });
            if (inFieldEnemies.length > 0) {
                return inFieldEnemies[Math.floor(Math.random() * inFieldEnemies.length)];
            }
        }
        return availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
    }

    update() {
        this.timer += 0.12;
        if (this.speedBoostTimer > 0) this.speedBoostTimer--;

        let currentSpeed = this.baseSpeed;
        if (this.skill.level >= 5 && this.speedBoostTimer > 0) {
            currentSpeed *= 1.5; // Lv5 吸血加速
        }

        // Lv7 泰然自若: 常にバリアとして当たり判定を出す
        if (this.skill.level >= 7 && this.skill.evo7 === "calm_drain") {
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (Math.hypot(e.x - this.x, e.y - this.y) < this.hitRadius + e.radius) {
                    this.skill.killEnemy(e);
                    this.createExplosion(e.x, e.y);
                    this.speedBoostTimer = 30;
                }
            }
        }

        if (this.state === 'orbit') {
            let orbitSpeed = 0.045;
            if (this.skill.level >= 7 && this.skill.evo7 === "calm_drain") {
                orbitSpeed = 0.15; // Lv7 泰然自若: 高速回転
            }

            this.angle += orbitSpeed;
            const wave = Math.sin(this.timer) * 18;
            const currentRadius = (this.orbitRadius + wave) * this.orbitMultiplier;
            
            const tx = player.x + Math.cos(this.angle) * currentRadius;
            const ty = player.y + Math.sin(this.angle) * currentRadius;
            
            this.x += (tx - this.x) * 0.12;
            this.y += (ty - this.y) * 0.12;

            if (enemies.length > 0 && Math.random() < this.attackRate) {
                const newTarget = this.findUniqueTarget();
                if (newTarget) {
                    this.target = newTarget;
                    this.target.targetedByVampire = true; 
                    this.state = 'attack';
                }
            }
        } else if (this.state === 'attack') {
            if (!this.target || !enemies.includes(this.target)) {
                if (this.target) this.target.targetedByVampire = false;
                this.target = null;
                this.state = 'orbit';
            } else {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.hypot(dx, dy);

                if (dist < this.hitRadius + this.target.radius) {
                    this.skill.killEnemy(this.target);
                    this.createExplosion(this.target.x, this.target.y);
                    if (this.skill.level >= 5) this.speedBoostTimer = 30; // 0.5秒間加速
                    
                    this.target = null;
                    
                    if (this.skill.level >= 7 && this.skill.evo7 === "blood_trail") {
                        // Lv7 血の軌跡: 待機時間なしで即座に次の敵へ
                        const nextTarget = this.findUniqueTarget();
                        if (nextTarget) {
                            this.target = nextTarget;
                            this.target.targetedByVampire = true;
                        } else {
                            this.state = 'orbit';
                        }
                    } else {
                        this.state = 'orbit';
                    }
                } else {
                    this.x += (dx/dist) * currentSpeed;
                    this.y += (dy/dist) * currentSpeed;
                }
            }
        }

        // 軌跡パーティクル生成
        let particleProb = 0.3;
        let isDamageTrail = false;
        if (this.skill.level >= 7 && this.skill.evo7 === "blood_trail") {
            particleProb = 1.0; // 血の軌跡：大量生成＆ダメージ判定
            isDamageTrail = true;
        }

        if (Math.random() < particleProb) {
            this.skill.particles.push(new VampireParticle(this.skill, this.x, this.y, VAMPIRE_THEME_COLOR, 1, isDamageTrail));
        }
    }

    createExplosion(x, y) {
        let isBloodArmor = this.skill.level >= 4 && this.skill.evo4 === "blood_armor";
        let explosionSize = isBloodArmor ? 8 : 4;
        let particleCount = isBloodArmor ? 24 : 12;

        for(let i=0; i < particleCount; i++) {
            this.skill.particles.push(new VampireParticle(this.skill, x, y, i % 2 === 0 ? "#ff0000" : "#ffcccc", explosionSize, false));
        }

        // Lv4 血の鎧: 爆発が範囲攻撃になる
        if (isBloodArmor) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (Math.hypot(e.x - x, e.y - y) < 80) { // 爆発半径
                    this.skill.killEnemy(e);
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const angle = (this.state === 'attack' && this.target) 
            ? Math.atan2(this.target.y - this.y, this.target.x - this.x) 
            : this.angle + Math.PI/2;
        ctx.rotate(angle);
        const flap = Math.sin(this.timer * 6) * 12;
        ctx.shadowBlur = 12;
        ctx.shadowColor = VAMPIRE_THEME_COLOR;
        ctx.fillStyle = "#1a0000";
        ctx.strokeStyle = VAMPIRE_THEME_COLOR;
        ctx.lineWidth = 1.8;
        
        ctx.beginPath();
        // Lv6 コウモリ巨大化
        let scale = this.skill.level >= 6 ? 1.5 : 1.0;
        ctx.scale(scale, scale);

        ctx.ellipse(0, 0, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.bezierCurveTo(-12, -12 - flap, -25, -5 + flap, -22, 5 + flap);
        ctx.quadraticCurveTo(-10, 8, -2, 2);
        ctx.moveTo(2, 0);
        ctx.bezierCurveTo(12, -12 - flap, 25, -5 + flap, 22, 5 + flap);
        ctx.quadraticCurveTo(10, 8, 2, 2);
        ctx.stroke();
        ctx.restore();
    }
}

class VampireSkill {
    constructor() {
        this.level = 1;
        this.bats = [];
        this.particles = [];
        this.evo4 = null;
        this.evo7 = null;
        this.updateStats();
        this.initBats();
    }

    updateStats() {
        this.batCount = 3; // Lv1
        this.detectionRadius = 250;

        if (this.level >= 2) this.batCount = 6; // Lv2
        if (this.level >= 4) {
            if (this.evo4 === "fatal_kin") this.batCount = 9;
            else if (this.evo4 === "blood_armor") this.batCount = 6;
        }
        if (this.level >= 7) {
            if (this.evo7 === "blood_trail") this.batCount = 16;
            // 泰然自若の場合は変わらず
        }
    }

    initBats() {
        const oldBats = this.bats;
        this.bats = [];
        for (let i = 0; i < this.batCount; i++) {
            const bat = new VampireBat(this, i, this.batCount);
            if (oldBats[i]) {
                bat.x = oldBats[i].x;
                bat.y = oldBats[i].y;
                bat.angle = oldBats[i].angle;
            }
            this.bats.push(bat);
        }
    }

    levelUp(branch) {
        this.level++;
        if (this.level === 4 && branch) this.evo4 = branch;
        if (this.level === 7 && branch) this.evo7 = branch;
        
        this.updateStats();
        this.initBats();
    }

    killEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            expGems.push(new ExpGem(enemy.x, enemy.y, 5));
            enemies.splice(index, 1);

            // Lv7 泰然自若: 敵を倒した際に低確率でHP回復
            if (this.level >= 7 && this.evo7 === "calm_drain") {
                if (Math.random() < 0.05 && player.hp !== undefined && player.maxHp !== undefined) {
                    player.hp = Math.min(player.maxHp, player.hp + 1);
                }
            }
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }
        this.bats.forEach(bat => bat.update());
    }

    draw(ctx) {
        // 泰然自若以外で、Lv3以上の索敵範囲描画
        if (this.level >= 3 && !(this.level >= 7 && this.evo7 === "calm_drain")) {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 0, 0, 0.15)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, this.detectionRadius, 0, Math.PI*2);
            ctx.stroke();
            ctx.fillStyle = "rgba(255, 0, 0, 0.02)";
            ctx.fill();
            ctx.restore();
        }

        this.particles.forEach(p => p.draw(ctx));
        this.bats.forEach(bat => bat.draw(ctx));
    }
}