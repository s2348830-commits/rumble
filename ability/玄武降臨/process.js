// 玄武降臨 (Genbu Kourin) - 書道極意・狂草一閃

class SumiParticle {
    constructor(x, y, vx, vy, size, life, decay, gravity = 0, pull = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.life = life; // 1.0 -> 0.0
        this.decay = decay;
        this.gravity = gravity;
        this.pull = pull; // Lv6: 引力フラグ
    }

    update(targetX, targetY) {
        if (this.pull) {
            // Lv6: 斬撃の軌道（パーティクルの現在地）へ敵を吸い寄せるためのロジックはSkillクラス側で処理
        }
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${this.life * 0.7})`;
        ctx.fill();
    }
}

class GenbuSlash {
    constructor(skill, type = "normal", angleOffset = 0) {
        this.skill = skill;
        this.type = type; // "normal", "thick", "circle", "v-left", "v-right"
        this.active = true;
        this.progress = 0;
        this.points = [];
        
        // 画面端から端への軌道を計算
        const margin = 100;
        const angle = (Math.random() * Math.PI * 2) + angleOffset;
        this.startX = player.x - Math.cos(angle) * 600;
        this.startY = player.y - Math.sin(angle) * 600;
        this.endX = player.x + Math.cos(angle) * 600;
        this.endY = player.y + Math.sin(angle) * 600;

        if (type === "circle") {
            this.radius = 300;
            this.centerX = player.x;
            this.centerY = player.y;
        }

        this.width = (type === "thick") ? 40 : 15;
        this.speed = 0.03;
    }

    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.active = false;
            // Lv5: 跳ねのエフェクトと吹き飛ばし
            if (this.skill.level >= 5 && this.type !== "circle") {
                this.skill.triggerHane(this.endX, this.endY);
            }
            return;
        }

        // 現在の筆の位置
        let curX, curY;
        if (this.type === "circle") {
            const a = this.progress * Math.PI * 2;
            curX = this.centerX + Math.cos(a) * this.radius;
            curY = this.centerY + Math.sin(a) * this.radius;
        } else {
            curX = this.startX + (this.endX - this.startX) * this.progress;
            curY = this.startY + (this.endY - this.startY) * this.progress;
        }

        // 墨飛沫の生成
        const pCount = (this.skill.level >= 2) ? 5 : 2;
        for (let i = 0; i < pCount; i++) {
            const vx = (Math.random() - 0.5) * 10;
            const vy = (Math.random() - 0.5) * 10;
            const size = Math.random() * this.width + 2;
            const lifeTime = (this.skill.level >= 3) ? 0.01 : 0.03; // Lv3: 残留時間延長
            this.skill.particles.push(new SumiParticle(curX, curY, vx, vy, size, 1.0, lifeTime, 0.2, (this.skill.level >= 6)));
        }

        // 当たり判定
        enemies.forEach(e => {
            const dist = Math.hypot(e.x - curX, e.y - curY);
            if (dist < this.width + (e.radius || 10)) {
                let damage = 50;
                if (this.type === "thick") damage *= 2.5; // 滲墨: 威力大幅上昇
                e.hp -= damage;
                if (e.hp <= 0) this.skill.killEnemy(e);
            }
        });
    }

    draw(ctx) {
        // 軌跡の描画（簡略化した筆致）
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = this.width;

        ctx.beginPath();
        if (this.type === "circle") {
            ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2 * this.progress);
        } else {
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(this.startX + (this.endX - this.startX) * this.progress, this.startY + (this.endY - this.startY) * this.progress);
        }
        ctx.stroke();
        ctx.restore();
    }
}

class GenbuKourinSkill {
    constructor() {
        this.level = 1;
        this.evo4 = null;
        this.evo7 = null;

        this.particles = [];
        this.slashes = [];
        this.rakkanZones = []; // Lv7: 落款聖域
        this.cooldown = 180;
        this.timer = 0;
        
        this.isInverting = false; // Lv7: 彩度反転フラグ
    }

    updateStats() {
        this.cooldown = 180;
        if (this.level >= 2) this.cooldown *= 0.8;
    }

    levelUp(branchId) {
        this.level++;
        if (this.level === 4) this.evo4 = branchId;
        if (this.level === 7) this.evo7 = branchId;
        this.updateStats();
    }

    killEnemy(e) {
        e.hp = 0;
        if (typeof e.onDeath === 'function') e.onDeath();
        const idx = enemies.indexOf(e);
        if (idx > -1) {
            if (typeof ExpGem !== 'undefined') expGems.push(new ExpGem(e.x, e.y, 5));
            enemies.splice(idx, 1);
        }
    }

    triggerHane(x, y) {
        // Lv5: 跳ねエフェクトと中心への吹き飛ばし
        for (let i = 0; i < 20; i++) {
            this.particles.push(new SumiParticle(x, y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 15, 1.0, 0.05));
        }
        enemies.forEach(e => {
            if (Math.hypot(e.x - x, e.y - y) < 150) {
                const angle = Math.atan2(player.y - e.y, player.x - e.x);
                e.x += Math.cos(angle) * 100;
                e.y += Math.sin(angle) * 100;
            }
        });
    }

    update() {
        this.timer++;

        // 斬撃の発動
        if (this.timer >= this.cooldown) {
            this.timer = 0;
            this.executeSlash();
        }

        // 斬撃とパーティクルの更新
        this.slashes = this.slashes.filter(s => s.active);
        this.slashes.forEach(s => s.update());

        this.particles.forEach((p, i) => {
            p.update();
            
            // Lv3: 墨に触れた敵の鈍足と継続ダメージ
            if (this.level >= 3 && p.life > 0.1) {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - p.x, e.y - p.y) < p.size * 2) {
                        if (!e.originalSpeed) e.originalSpeed = e.speed;
                        e.speed = e.originalSpeed * 0.7; // 30%低下
                        e.hp -= 0.1;
                    } else if (e.originalSpeed) {
                        e.speed = e.originalSpeed;
                    }
                });
            }

            // Lv6: 引力（斬撃の跡へ吸い寄せる）
            if (this.level >= 6 && p.life > 0.5) {
                enemies.forEach(e => {
                    const d = Math.hypot(e.x - p.x, e.y - p.y);
                    if (d < 100) {
                        e.x += (p.x - e.x) * 0.05;
                        e.y += (p.y - e.y) * 0.05;
                    }
                });
            }

            if (p.life <= 0) this.particles.splice(i, 1);
        });

        // Lv7: 落款聖域の更新
        this.rakkanZones = this.rakkanZones.filter(z => z.life > 0);
        this.rakkanZones.forEach(z => {
            z.life--;
            const dist = Math.hypot(player.x - z.x, player.y - z.y);
            if (dist < 100) {
                // ダメージカットのフラグをプレイヤーに付与（main.js側で判定が必要）
                player.isProtectedByRakkan = true;
            }
        });
    }

    async executeSlash() {
        if (this.level >= 7 && this.evo7 === "万里救援") {
            // 万里救援: 0.5s間隔で3回
            for (let i = 0; i < 3; i++) {
                this.slashes.push(new GenbuSlash(this));
                const rx = player.x + (Math.random() - 0.5) * 200;
                const ry = player.y + (Math.random() - 0.5) * 200;
                this.rakkanZones.push({ x: rx, y: ry, life: 120 });
                await new Promise(r => setTimeout(r, 500));
            }
            return;
        }

        if (this.level >= 7 && this.evo7 === "超群技巧") {
            // 超群技巧: 巨大な円
            this.isInverting = true;
            this.slashes.push(new GenbuSlash(this, "circle"));
            setTimeout(() => {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - player.x, e.y - player.y) < 300) {
                        e.hp -= e.maxHp * 0.3; // 最大HPの30%ダメージ
                        if (e.hp <= 0) this.killEnemy(e);
                    }
                });
                // パーティクルを集束
                this.particles.forEach(p => {
                    p.vx = (player.x - p.x) * 0.2;
                    p.vy = (player.y - p.y) * 0.2;
                });
                this.isInverting = false;
            }, 800);
            return;
        }

        if (this.level >= 4) {
            if (this.evo4 === "飛白") {
                this.slashes.push(new GenbuSlash(this, "normal", -0.3));
                this.slashes.push(new GenbuSlash(this, "normal", 0.3));
            } else {
                this.slashes.push(new GenbuSlash(this, "thick"));
            }
        } else {
            this.slashes.push(new GenbuSlash(this, "normal"));
        }
    }

    draw(ctx) {
        // Lv7: 彩度反転エフェクト
        if (this.isInverting) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.filter = "invert(100%) hue-rotate(180deg)";
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // 落款（赤い印鑑）の描画
        this.rakkanZones.forEach(z => {
            ctx.save();
            ctx.fillStyle = "rgba(178, 34, 34, 0.6)";
            ctx.fillRect(z.x - 20, z.y - 20, 40, 40);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.strokeRect(z.x - 18, z.y - 18, 36, 36);
            ctx.restore();
        });

        this.particles.forEach(p => p.draw(ctx));
        this.slashes.forEach(s => s.draw(ctx));
        
        // Lv7: 万里救援の魔法陣
        if (this.level >= 7 && this.evo7 === "万里救援") {
            ctx.save();
            ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
            ctx.beginPath();
            ctx.arc(player.x, player.y, 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}