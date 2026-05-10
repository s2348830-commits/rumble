// 合成技: 光影の識別 (Fusion: Light and Shadow)

class FusionSingularity {
    constructor(skill, x, y, isMega = false) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.isMega = isMega;
        this.life = 60; // 魔法陣が消えるまでのフレーム
        this.progress = 0;
        
        // 落下開始位置（左上から）
        this.startX = x - 200;
        this.startY = y - 400;
        // 反対側の落下開始位置（右上から）
        this.oppX = x + 200;
    }

    update() {
        this.progress += 0.05;
        if (this.progress >= 1 && this.life > 0) {
            this.life--;
            
            // 爆発の瞬間（落下が完了した直後）
            if (this.life === 59) {
                const hitRadius = this.isMega ? 500 : 100;
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < hitRadius + e.radius) {
                        this.skill.killEnemy(e);
                    }
                });
                
                // 大量のパーティクル（赤と白）
                const pCount = this.isMega ? 80 : 30;
                for(let i = 0; i < pCount; i++) {
                    this.skill.particles.push(new FusionParticle(this.x, this.y, i % 2 === 0 ? '#ff0033' : '#ffffff', this.isMega ? 20 : 10));
                }
            }
        }
    }

    draw(ctx) {
        if (this.progress < 1) {
            // 二極が同時に交差する落下軌跡
            let currentX = this.startX + (this.x - this.startX) * this.progress;
            let currentY = this.startY + (this.y - this.startY) * this.progress;
            
            let oppCurrentX = this.oppX + (this.x - this.oppX) * this.progress;
            
            ctx.save();
            ctx.lineWidth = this.isMega ? 6 : 3;
            ctx.lineCap = "round";
            
            // 赤の軌跡
            ctx.strokeStyle = '#ff0033';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0033';
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(currentX - (this.x - this.startX)*0.1, currentY - (this.y - this.startY)*0.1);
            ctx.stroke();
            
            // 白の軌跡
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(oppCurrentX, currentY);
            ctx.lineTo(oppCurrentX - (this.x - this.oppX)*0.1, currentY - (this.y - this.startY)*0.1);
            ctx.stroke();
            ctx.restore();

        } else if (this.life > 0) {
            // 交差後の魔法陣（特異点）
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((60 - this.life) * 0.1);
            
            ctx.strokeStyle = '#1a0025'; // void color
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0033';
            ctx.lineWidth = this.isMega ? 8 : 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.isMega ? 150 : 50, 0, Math.PI*2);
            ctx.stroke();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = this.isMega ? 3 : 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.isMega ? 100 : 30, 0, Math.PI*2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

class FusionParticle {
    constructor(x, y, color, speed) {
        this.x = x; this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const vel = Math.random() * speed;
        this.vx = Math.cos(angle) * vel;
        this.vy = Math.sin(angle) * vel;
        this.life = 1.0;
        this.size = Math.random() * 3 + 2;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.9; this.vy *= 0.9;
        this.life -= 0.02;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

class FusionLightShadowSkill {
    constructor() {
        this.level = 7;
        this.timer = 0;
        this.phase = 'IDLE'; // IDLE -> RAIN -> FINISH
        this.shots = 0;
        this.singularities = [];
        this.particles = [];
        this.invertTimer = 0;
    }
    
    levelUp(branch) {
        // MAXレベル固定のため処理なし
    }

    killEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            expGems.push(new ExpGem(enemy.x, enemy.y, 5));
            enemies.splice(index, 1);
        }
    }

    update() {
        this.timer++;
        
        if (this.phase === 'IDLE') {
            if (this.timer >= 300) { // 5秒ごとに発動
                this.timer = 0;
                this.phase = 'RAIN';
                this.shots = 0;
            }
        } else if (this.phase === 'RAIN') {
            // 識別の雨
            if (this.timer % 10 === 0) {
                let tx = player.x + (Math.random() - 0.5) * width;
                let ty = player.y + (Math.random() - 0.5) * height;
                this.singularities.push(new FusionSingularity(this, tx, ty, false));
                this.shots++;
            }
            if (this.shots >= 15) {
                this.phase = 'FINISH';
                this.timer = 0;
            }
        } else if (this.phase === 'FINISH') {
            if (this.timer === 60) {
                // 真の識別 (画面中央で巨大爆発)
                this.singularities.push(new FusionSingularity(this, player.x, player.y, true));
            }
            if (this.timer === 120) { // 爆発の瞬間
                // 背景色の一時的な反転
                this.invertTimer = 30; // 0.5秒
                canvas.style.filter = 'invert(1) contrast(2)';
                
                // カメラ対応: 現在の画面内にいる敵を計算
                enemies.forEach(e => {
                    const inScreen = e.x > player.x - width/2 && e.x < player.x + width/2 && e.y > player.y - height/2 && e.y < player.y + height/2;
                    if (inScreen) {
                        if (e.hp !== undefined) {
                            e.hp = Math.ceil(e.hp / 2);
                        } else {
                            if (Math.random() < 0.5) {
                                this.killEnemy(e);
                            }
                        }
                    }
                });
            }
            if (this.timer >= 180) {
                this.phase = 'IDLE';
                this.timer = 0;
            }
        }
        
        // 反転の解除
        if (this.invertTimer > 0) {
            this.invertTimer--;
            if (this.invertTimer === 0) {
                canvas.style.filter = 'none';
            }
        }
        
        for (let i = this.singularities.length - 1; i >= 0; i--) {
            this.singularities[i].update();
            if (this.singularities[i].progress >= 1 && this.singularities[i].life <= 0) {
                this.singularities.splice(i, 1);
            }
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        this.singularities.forEach(s => s.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
    }
}