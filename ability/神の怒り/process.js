// 神の怒り (Wrath of God) の演出・ロジック

class GoldParticle {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10 - 2;
        this.life = 1.0;
        this.size = Math.random() * 3 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; 
        this.vx *= 0.95; 
        this.life -= 0.02;

        // Lv5: 黄金の粒子の魔力化
        if (this.skill.level >= 5 && this.life > 0) {
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + this.size) {
                    if (Math.random() < 0.05) { // 雑魚敵を確率で削り取る
                        this.skill.killEnemy(e);
                        this.life = 0;
                    }
                }
            });
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class DivineRing {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 100;
        this.life = 1.0;
        
        // Lv2: ring-expandの速度向上
        this.expandSpeed = skill.level >= 2 ? 8 : 4;
        
        // Lv6: 聖域の展開
        this.isSanctuary = skill.level >= 6;
        this.sanctuaryLife = 120; // 2秒間 (60FPS)
    }
    update() {
        if (this.radius < this.maxRadius) {
            this.radius += this.expandSpeed;
        } else {
            if (this.isSanctuary && this.sanctuaryLife > 0) {
                this.sanctuaryLife--;
            } else {
                this.life -= 0.05;
            }
        }

        // 聖域ダメージと鈍足効果
        if (this.isSanctuary && this.sanctuaryLife > 0 && this.radius >= this.maxRadius) {
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < this.maxRadius) {
                    if (!e.isSlowedBySanctuary) {
                        e.originalSpeed = e.speed;
                        e.isSlowedBySanctuary = true;
                        e.speed *= 0.5;
                    }
                    if (Math.random() < 0.02) { 
                        this.skill.killEnemy(e);
                    }
                }
            });
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.isSanctuary && this.sanctuaryLife > 0 ? 0.3 : Math.max(0, this.life);
        ctx.strokeStyle = "#ffffcc";
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffffcc";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

class Crack {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 1.0;
        this.angle = Math.random() * Math.PI;
    }
    update() {
        this.life -= 0.02;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-60, 0);
        ctx.lineTo(60, 0);
        ctx.moveTo(0, -60);
        ctx.lineTo(0, 60);
        ctx.stroke();
        ctx.restore();
    }
}

class DivineStrike {
    constructor(skill, x, y, isSmall = false, isHeavenly = false) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.isSmall = isSmall;
        this.isHeavenly = isHeavenly;
        
        this.width = isSmall ? 15 : (isHeavenly ? 60 : 30);
        this.progress = 0; 
        this.state = "FALLING"; 
        this.fade = 1.0;
        this.delay = 0;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        if (this.state === "FALLING") {
            this.progress += 0.2;
            if (this.progress >= 1) {
                this.state = "STRIKE";
                this.progress = 1;
                this.doStrike();
            }
        } else if (this.state === "STRIKE") {
            this.state = "FADE";
        } else if (this.state === "FADE") {
            this.fade -= 0.1;
        }
    }

    doStrike() {
        let hitRadius = this.width * 2;
        enemies.forEach(e => {
            if (Math.hypot(e.x - this.x, e.y - this.y) < hitRadius + e.radius) {
                this.skill.killEnemy(e);
            }
        });

        this.skill.rings.push(new DivineRing(this.skill, this.x, this.y));
        for(let i=0; i<15; i++) {
            this.skill.particles.push(new GoldParticle(this.skill, this.x, this.y));
        }

        if (this.isHeavenly) {
            this.skill.cracks.push(new Crack(this.x, this.y));
        }

        // Lv3: 余震
        if (this.skill.level >= 3 && !this.isSmall) {
            let aftershock = new DivineStrike(this.skill, this.x, this.y, true);
            aftershock.delay = 30; // 0.5秒後
            this.skill.strikes.push(aftershock);
        }
    }

    draw(ctx) {
        if (this.delay > 0) return;
        if (this.fade <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.fade);
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ffffaa";

        if (this.state === "FALLING") {
            const startY = this.y - 1000 + (1000 * this.progress);
            ctx.fillRect(this.x - this.width/2, startY, this.width, 1000);
        } else {
            ctx.fillRect(this.x - this.width/2, 0, this.width, this.y);
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.width*1.5, this.width*0.5, 0, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Lv7 創世の光 コア
class ApocalypseCore {
    constructor(skill) {
        this.skill = skill;
        this.timer = 0;
    }
    update() {
        // 敵がリーチ内（一定距離）にいない場合は発動を一時停止
        let hasEnemyInReach = enemies.some(e => Math.hypot(e.x - player.x, e.y - player.y) <= this.skill.maxReach);
        if (!hasEnemyInReach) return;

        this.timer++;
        if (this.timer % 60 === 0) {
            let ring = new DivineRing(this.skill, player.x, player.y);
            ring.maxRadius = 1500;
            ring.expandSpeed = 20;
            this.skill.rings.push(ring);
            
            // 白飛びエフェクトとシェイク
            this.skill.whiteFlash = 1.0;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 50;
        ctx.shadowColor = "#ffff00";
        ctx.beginPath();
        ctx.arc(0, 0, 30 + Math.sin(this.timer*0.1)*10, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

class WrathOfGodSkill {
    constructor() {
        this.level = 1;
        this.evo4 = null;
        this.evo7 = null;
        this.strikes = [];
        this.rings = [];
        this.particles = [];
        this.cracks = [];
        this.core = null;
        
        this.timer = 0;
        this.whiteFlash = 0;

        this.updateStats();
    }

    updateStats() {
        this.mainInterval = 180; // 3000ms = 180frames
        this.maxReach = 350; // プレイヤーを中心としたリーチ（一定距離）
        if (this.level >= 2) {
            this.mainInterval = 132; // 2200ms = 132frames
        }
    }

    levelUp(branch) {
        this.level++;
        if (this.level === 4 && branch) this.evo4 = branch;
        if (this.level === 7 && branch) {
            this.evo7 = branch;
            if (branch === "genesis_light") {
                this.core = new ApocalypseCore(this);
            }
        }
        this.updateStats();
    }

    killEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            expGems.push(new ExpGem(enemy.x, enemy.y, 5));
            enemies.splice(index, 1);
        }
    }

    update() {
        // 鈍足の強制解除（毎フレーム）
        enemies.forEach(e => {
            if (e.isSlowedBySanctuary) {
                e.speed = e.originalSpeed || e.speed;
                e.isSlowedBySanctuary = false;
            }
        });

        if (this.core) this.core.update();

        // リーチ内（プレイヤーから maxReach 以内）にいる敵をリストアップ
        let enemiesInReach = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) <= this.maxReach);

        if (this.timer >= this.mainInterval) {
            if (enemiesInReach.length > 0) {
                // 敵がリーチ内にいる場合のみ技を発動し、タイマーリセット
                this.timer = 0;
                this.castStrike(enemiesInReach);
            } else {
                // 敵がリーチ内にいない場合はゲージMAXで待機（発動しない）
                this.timer = this.mainInterval;
            }
        } else {
            this.timer++;
        }

        [this.strikes, this.rings, this.particles, this.cracks].forEach(arr => {
            for (let i = arr.length - 1; i >= 0; i--) {
                arr[i].update();
                if (arr[i].fade <= 0 || arr[i].life <= 0) {
                    arr.splice(i, 1);
                }
            }
        });

        if (this.whiteFlash > 0) this.whiteFlash -= 0.05;
    }

    castStrike(enemiesInReach) {
        if (!enemiesInReach || enemiesInReach.length === 0) return;

        if (this.level >= 7 && this.evo7 === "heavenly_army") {
            let dirX = Input.vx !== 0 ? Input.vx : 1;
            let dirY = Input.vy !== 0 ? Input.vy : 0;
            
            for(let i=0; i<5; i++) {
                let tx = player.x + (Math.random()-0.5)*300 + dirX * 150;
                let ty = player.y + (Math.random()-0.5)*300 + dirY * 150;
                let strike = new DivineStrike(this, tx, ty, false, true);
                strike.delay = i * 10;
                this.strikes.push(strike);
            }
        } 
        else if (this.level >= 4 && this.evo4 === "super_skill") {
            for(let i=0; i<5; i++) {
                // リーチ内の敵からランダムにターゲットを選び、その付近に落とす
                let target = enemiesInReach[Math.floor(Math.random() * enemiesInReach.length)];
                let tx = target.x + (Math.random()-0.5)*100;
                let ty = target.y + (Math.random()-0.5)*100;
                let strike = new DivineStrike(this, tx, ty);
                strike.delay = i * 15;
                this.strikes.push(strike);
            }
        } 
        else if (this.level >= 4 && this.evo4 === "dazzling_light") {
            let target = enemiesInReach[Math.floor(Math.random() * enemiesInReach.length)];
            let cx = target.x; 
            let cy = target.y;
            const dists = [{x:0, y:0}, {x:-100,y:0}, {x:100,y:0}, {x:0,y:-100}, {x:0,y:100}];
            dists.forEach(d => {
                this.strikes.push(new DivineStrike(this, cx + d.x, cy + d.y));
            });
        } 
        else {
            let target = enemiesInReach[Math.floor(Math.random() * enemiesInReach.length)];
            let tx = target.x; 
            let ty = target.y;
            this.strikes.push(new DivineStrike(this, tx, ty));
        }
    }

    draw(ctx) {
        if (this.whiteFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.whiteFlash})`;
            ctx.fillRect(0, 0, width, height);
        }

        let isShaking = this.core || this.whiteFlash > 0;
        if (isShaking) {
            let shakeX = (Math.random()-0.5) * 10 * Math.max(this.whiteFlash, 0.5);
            let shakeY = (Math.random()-0.5) * 10 * Math.max(this.whiteFlash, 0.5);
            ctx.save();
            ctx.translate(shakeX, shakeY);
        }

        this.cracks.forEach(c => c.draw(ctx));
        this.rings.forEach(r => r.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
        this.strikes.forEach(s => s.draw(ctx));

        if (this.core) this.core.draw(ctx);

        if (isShaking) ctx.restore();
    }
}