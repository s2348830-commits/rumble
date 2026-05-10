// 神怒天罰 (Holy Punishment) の演出・ロジック

class HolySeal {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.life = 60; // 1秒(60フレーム)で槍が落ちる
        this.radius = 40;
        this.rotation = 0;
        if(skill.level >= 6) this.radius = 50; // Lv6: 三重魔法陣用に拡大
    }
    update() {
        this.life--;
        this.rotation += 0.05;

        enemies.forEach(e => {
            let dx = this.x - e.x;
            let dy = this.y - e.y;
            let dist = Math.hypot(dx, dy);

            // 円（魔法陣）の中に敵が入ったら鈍足をつける
            if (dist < this.radius + e.radius) {
                if (!e.isSlowedByHolySeal) {
                    e.originalSpeed = e.speed;
                    e.isSlowedByHolySeal = true;
                    e.speed *= 0.3; // 速度を30%に低下（鈍足）
                }
            }

            // Lv4: 烈日の怒り (吸い寄せ効果)
            if (this.skill.level >= 4 && this.skill.evo4 === "fury_of_the_sun") {
                if (dist < 200) {
                    e.x += (dx / dist) * 1.5;
                    e.y += (dy / dist) * 1.5;
                }
            }
        });

        if (this.life <= 0) {
            this.skill.spears.push(new HolySpear(this.skill, this.x, this.y));
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffaa00";

        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI*2); ctx.stroke();
        
        // Lv6: 三重
        if (this.skill.level >= 6) {
            ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI*2); ctx.stroke();
        }
        ctx.restore();
    }
}

class HolySpear {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.progress = 0;
        // Lv5: 槍の高速化 (0.4s -> 0.2s 相当に短縮)
        this.speed = skill.level >= 5 ? 0.08 : 0.04; 
    }
    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.skill.pillars.push(new HolyPillar(this.skill, this.x, this.y));
        }
    }
    draw(ctx) {
        if (this.progress >= 1) return;
        let startY = this.y - 600;
        let currentY = startY + 600 * this.progress;

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffaa00";
        ctx.beginPath();
        ctx.moveTo(this.x, currentY); // 先端
        ctx.lineTo(this.x - 5, currentY - 60);
        ctx.lineTo(this.x + 5, currentY - 60);
        ctx.fill();
        ctx.restore();
    }
}

class HolyPillar {
    constructor(skill, x, y, widthOverride = null) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.life = 30; // 0.5秒表示
        // Lv6: 光柱がより太くなる
        this.width = widthOverride || (skill.level >= 6 ? 150 : 100); 
        
        let hitR = this.width / 2;
        enemies.forEach(e => {
            if (Math.hypot(e.x - this.x, e.y - this.y) < hitR + e.radius) {
                this.skill.killEnemy(e);
            }
        });
    }
    update() {
        this.life--;
        if (this.life === 0 && this.skill.level >= 3 && !this.widthOverride) {
            // Lv3: 聖域の萌芽 (左右に衝撃波)
            this.skill.shockwaves.push(new Shockwave(this.skill, this.x, this.y, -1));
            this.skill.shockwaves.push(new Shockwave(this.skill, this.x, this.y, 1));
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / 30;
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ffd700";
        ctx.fillRect(this.x - this.width/2, 0, this.width, this.y);
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width/2, 20, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

class Shockwave {
    constructor(skill, x, y, dir) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.life = 20;
        this.vx = dir * 12;
        this.hitCooldowns = new Map();
    }
    update() {
        this.x += this.vx;
        this.life--;
        
        enemies.forEach(e => {
            if (Math.hypot(e.x - this.x, e.y - this.y) < 40 + e.radius) {
                if (!this.hitCooldowns.has(e)) {
                    this.skill.killEnemy(e);
                    this.hitCooldowns.set(e, true);
                }
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / 20;
        ctx.fillStyle = "#ffaa00";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffaa00";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

class HolyWingParticle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * 2 + 1; 
        this.life = 30;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life--;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life / 30;
        ctx.fillStyle = "#ffffaa";
        ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class HolyPunishmentSkill {
    constructor() {
        this.level = 1;
        this.evo4 = null;
        this.evo7 = null;
        
        this.seals = [];
        this.spears = [];
        this.pillars = [];
        this.shockwaves = [];
        this.wingParticles = [];
        
        this.timer = 0;
        this.silenceTimer = 0;
        this.unforgivenTimer = 0;
        this.unforgivenStep = 0;
        this.whiteFlash = 0;
        this.screenShake = 0;
        
        this.updateStats();
    }
    
    updateStats() {
        this.interval = 150; // 2.5s = 150f
        this.count = 1;
        
        if (this.level >= 2) this.interval = 108; // 1.8s = 108f
        if (this.level >= 4) {
            if (this.evo4 === "divine_protection") this.count = 5;
            else if (this.evo4 === "fury_of_the_sun") this.count = 3;
        }
    }
    
    levelUp(branch) {
        this.level++;
        if (this.level === 4 && branch) this.evo4 = branch;
        if (this.level === 7 && branch) this.evo7 = branch;
        this.updateStats();
    }
    
    killEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            expGems.push(new ExpGem(enemy.x, enemy.y, 5));
            enemies.splice(index, 1);
        }
    }
    
    castSeal(tx, ty) {
        this.seals.push(new HolySeal(this, tx, ty));
    }
    
    update() {
        // 鈍足の強制解除（毎フレーム）
        enemies.forEach(e => {
            if (e.isSlowedByHolySeal) {
                e.speed = e.originalSpeed || e.speed;
                e.isSlowedByHolySeal = false;
            }
        });

        this.timer++;
        
        if (this.level >= 7 && this.evo7 === "unforgiven_decree") {
            // Lv7: 神令無赦
            this.screenShake = 5;
            if (this.timer >= 300) { // 5秒ごとに大技
                this.timer = 0;
                this.unforgivenTimer = 60; 
                this.unforgivenStep = 0;
            }
            if (this.unforgivenTimer > 0) {
                this.unforgivenTimer--;
                if (this.unforgivenTimer % 5 === 0) {
                    // カメラ対応: プレイヤー基準で画面の左端から右端へ
                    let px = player.x - width/2 + (this.unforgivenStep / 12) * width; 
                    this.pillars.push(new HolyPillar(this, px, player.y + (Math.random()-0.5)*200, 250));
                    this.unforgivenStep++;
                }
                if (this.unforgivenTimer === 0) {
                    this.whiteFlash = 1.0; // 究極のフラッシュ
                }
            }
        } 
        else if (this.level >= 7 && this.evo7 === "silence") {
            // Lv7: 沈黙
            // 光の翼エフェクト
            if (Math.random() < 0.4) {
                this.wingParticles.push(new HolyWingParticle(player.x - 20 + Math.random()*10, player.y - 10));
                this.wingParticles.push(new HolyWingParticle(player.x + 10 + Math.random()*10, player.y - 10));
            }
            
            // プレイヤーに接近する敵を自動で焼く処理（簡易当たり判定）
            enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) < 80) {
                    if (Math.random() < 0.05) this.killEnemy(e);
                }
            });
            
            this.silenceTimer++;
            if (this.silenceTimer >= 150) { // 2.5秒ごと
                this.silenceTimer = 0;
                for (let i = 0; i < 6; i++) {
                    let angle = (Math.PI * 2 / 6) * i;
                    let tx = player.x + Math.cos(angle) * 150;
                    let ty = player.y + Math.sin(angle) * 150;
                    this.castSeal(tx, ty);
                }
            }
        } 
        else {
            // 通常時およびLv6までの発動
            if (this.timer >= this.interval) {
                this.timer = 0;
                for(let i=0; i<this.count; i++) {
                    let target = enemies[Math.floor(Math.random() * enemies.length)];
                    if (target) {
                        this.castSeal(target.x + (Math.random()-0.5)*50, target.y + (Math.random()-0.5)*50);
                    } else {
                        this.castSeal(player.x + (Math.random()-0.5)*300, player.y + (Math.random()-0.5)*300);
                    }
                }
            }
        }

        [this.seals, this.spears, this.pillars, this.shockwaves, this.wingParticles].forEach(arr => {
            for (let i = arr.length - 1; i >= 0; i--) {
                arr[i].update();
                if (arr[i].progress >= 1 || arr[i].life <= 0) {
                    arr.splice(i, 1);
                }
            }
        });

        if (this.whiteFlash > 0) this.whiteFlash -= 0.02;
    }
    
    draw(ctx) {
        if (this.whiteFlash > 0) {
            ctx.save();
            // カメラ分を戻して画面全体を塗る
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.whiteFlash})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
        
        ctx.save();
        if (this.screenShake > 0) {
            let sx = (Math.random()-0.5) * this.screenShake;
            let sy = (Math.random()-0.5) * this.screenShake;
            ctx.translate(sx, sy);
        }

        // 沈黙の追従魔法陣
        if (this.level >= 7 && this.evo7 === "silence") {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(Date.now()*0.001);
            ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 200, 0, Math.PI*2); ctx.stroke();
            ctx.setLineDash([10, 10]);
            ctx.beginPath(); ctx.arc(0, 0, 180, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        
        // 神令無赦の巨大中心魔法陣
        if (this.level >= 7 && this.evo7 === "unforgiven_decree") {
            ctx.save();
            // カメラ対応: 画面の中央は player.x, player.y に等しい
            ctx.translate(player.x, player.y);
            ctx.rotate(-Date.now()*0.002);
            ctx.strokeStyle = "rgba(255, 50, 0, 0.3)";
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(0, 0, 300, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }

        this.seals.forEach(s => s.draw(ctx));
        this.wingParticles.forEach(w => w.draw(ctx));
        this.shockwaves.forEach(s => s.draw(ctx));
        this.pillars.forEach(p => p.draw(ctx));
        this.spears.forEach(s => s.draw(ctx));

        ctx.restore();
    }
}