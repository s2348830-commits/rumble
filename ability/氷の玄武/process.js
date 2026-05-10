// 氷の玄武 (Ice Genbu - Ink Sublimation) の演出・ロジック

class IceGenbuInkParticle {
    constructor(skill, x, y, speed, size) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = size;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.life -= this.decay;
        
        if (this.life > 0) {
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + this.size) {
                    // 墨に触れた敵は1.5秒間(90フレーム)、移動速度90%減少
                    if (!e.isStunnedByIceGenbu) { // 完全拘束中でなければ鈍足適用
                        e.originalSpeed = e.originalSpeed || e.speed;
                        e.speed = e.originalSpeed * 0.1;
                        e.isSlowedByIceGenbu = true;
                    }
                    e.iceGenbuSlowTimer = 90; 
                }
            });
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(15, 15, 15, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class IceGenbuCrystal {
    constructor(skill, x, y, angle) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.life = 60;
        this.maxLife = 60;
        this.size = 0;
        this.targetSize = Math.random() * 20 + 30;
    }
    update() {
        this.life--;
        if (this.life > 40) {
            this.size += (this.targetSize - this.size) * 0.2; // 結晶が成長
        } else if (this.life < 15) {
            this.size *= 0.8; // 砕け散る
        }

        // 結晶が最大になったタイミングで攻撃判定
        if (this.life === 40) {
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < this.size * 1.5) {
                    let isSublimation = false;
                    
                    // 墨の鈍足状態（iceGenbuSlowTimer > 0）の敵に当たると「昇華」発生
                    if (e.iceGenbuSlowTimer > 0) {
                        isSublimation = true;
                        // 最大HPの5%の追加ダメージ (HPプロパティがあれば減算)
                        if (e.hp && e.maxHp) {
                            e.hp -= e.maxHp * 0.05;
                        }
                        this.skill.sublimations.push(new SublimationEffect(e.x, e.y));
                    }
                    
                    // 昇華発生時は確定キル（即死）、そうでない場合も高確率で粉砕
                    if (isSublimation || Math.random() < 0.8) {
                        this.skill.killEnemy(e);
                    }
                }
            });
            
            // 氷の破片を散らす
            for(let i=0; i<3; i++) {
                this.skill.shards.push(new IceGenbuShard(this.x, this.y));
            }
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + (60 - this.life) * 0.02);
        
        let alpha = Math.min(1, this.life / 15);
        ctx.globalAlpha = alpha;
        
        ctx.fillStyle = '#e0faff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00e5ff';
        
        // 鋭利な氷結晶の描画
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size * 0.4, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size * 0.4, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#0099ff';
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.8);
        ctx.lineTo(this.size * 0.2, 0);
        ctx.lineTo(0, this.size * 0.8);
        ctx.lineTo(-this.size * 0.2, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

class IceGenbuShard {
    constructor(x, y) {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 20;
        this.size = Math.random() * 5 + 3;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life--;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life / 20;
        ctx.fillStyle = '#80ffff';
        ctx.translate(this.x, this.y);
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

// 昇華エフェクト（墨＋氷の爆発とテキスト）
class SublimationEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 40;
        this.radius = 10;
    }
    update() {
        this.life--;
        this.radius += 4;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 墨と氷が混ざった波動
        ctx.globalCompositeOperation = 'lighter';
        let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        grad.addColorStop(0, `rgba(0, 229, 255, ${this.life / 40})`);
        grad.addColorStop(0.5, `rgba(50, 50, 255, ${this.life / 80})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 「昇華」の文字
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(255, 255, 255, ${this.life / 40})`;
        ctx.font = "bold 22px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00e5ff';
        ctx.fillText("昇華", 0, -this.radius * 0.5);
        
        ctx.restore();
    }
}

class IceGenbuEnso {
    constructor(skill, x, y, radius) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.life = 150; 
        this.crystalsSpawned = false;
        
        // 瞬時に墨をまき散らす
        for(let i=0; i<80; i++) {
            this.skill.inkParticles.push(new IceGenbuInkParticle(this.skill, this.x, this.y, Math.random()*20 + 5, Math.random()*8 + 4));
        }
        
        // 範囲内の敵を強制拘束
        enemies.forEach(e => {
            if (Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                e.originalSpeed = e.originalSpeed || e.speed;
                e.speed = 0;
                e.isStunnedByIceGenbu = true;
                e.iceGenbuStunTimer = 150; // 2.5秒間拘束
            }
        });
        
        // 画面揺らし
        document.getElementById('gameCanvas').style.animation = 'none';
        setTimeout(() => {
            document.getElementById('gameCanvas').style.animation = 'shake 0.5s screen';
        }, 10);
    }
    
    update() {
        this.life--;
        // 円相が描かれた少し後に氷結晶が軌跡に沿って一斉に噴き出す
        if (this.life === 120 && !this.crystalsSpawned) {
            this.crystalsSpawned = true;
            let count = 36;
            for(let i=0; i<count; i++) {
                let angle = (Math.PI * 2 / count) * i;
                let cx = this.x + Math.cos(angle) * this.radius;
                let cy = this.y + Math.sin(angle) * this.radius;
                this.skill.crystals.push(new IceGenbuCrystal(this.skill, cx, cy, angle));
            }
        }
    }
    
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 巨大な墨の円相
        let alpha = Math.min(1, this.life / 30);
        ctx.strokeStyle = `rgba(15, 15, 15, ${alpha})`;
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // かすれ表現
        ctx.strokeStyle = `rgba(40, 40, 40, ${alpha * 0.8})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

class IceGenbuSkill {
    constructor() {
        this.level = 7;
        this.timer = 0;
        this.interval = 360; // 6秒ごとに発動
        
        this.ensos = [];
        this.inkParticles = [];
        this.crystals = [];
        this.shards = [];
        this.sublimations = [];
    }
    
    levelUp() {
        // 最初からLv7なので処理なし
    }

    killEnemy(enemy) {
        const index = enemies.indexOf(enemy);
        if (index > -1) {
            expGems.push(new ExpGem(enemy.x, enemy.y, 8));
            enemies.splice(index, 1);
        }
    }
    
    update() {
        this.timer++;
        
        if (this.timer >= this.interval) {
            this.timer = 0;
            this.ensos.push(new IceGenbuEnso(this, player.x, player.y, 250));
        }
        
        // 敵のデバフタイマー管理 (拘束と鈍足)
        enemies.forEach(e => {
            // 強制拘束タイマー
            if (e.iceGenbuStunTimer > 0) {
                e.iceGenbuStunTimer--;
                e.speed = 0; // 拘束を維持
                if (e.iceGenbuStunTimer <= 0) {
                    e.isStunnedByIceGenbu = false;
                    // 他の拘束スキルがなければ速度を戻す
                    if (!e.isStunnedByCrimson && !e.isFrozenByFrost && !e.isFrozenByAbsolute) {
                        e.speed = e.originalSpeed || 1;
                    }
                }
            }
            
            // 墨による90%鈍足タイマー
            if (e.iceGenbuSlowTimer > 0) {
                e.iceGenbuSlowTimer--;
                if (e.iceGenbuSlowTimer <= 0) {
                    e.isSlowedByIceGenbu = false;
                    // 拘束中でなければ速度を元に戻す
                    if (e.iceGenbuStunTimer <= 0 && !e.isStunnedByCrimson && !e.isFrozenByFrost && !e.isFrozenByAbsolute) {
                        e.speed = e.originalSpeed || 1;
                    }
                } else if (e.iceGenbuStunTimer <= 0 && !e.isStunnedByCrimson && !e.isFrozenByFrost) {
                    // 拘束中でない場合のみ、鈍足速度を適用し続ける
                    e.speed = (e.originalSpeed || 1) * 0.1; 
                }
            }
        });

        // 要素の更新と削除
        [this.ensos, this.inkParticles, this.crystals, this.shards, this.sublimations].forEach(arr => {
            for (let i = arr.length - 1; i >= 0; i--) {
                arr[i].update();
                if (arr[i].life <= 0) arr.splice(i, 1);
            }
        });
    }
    
    draw(ctx) {
        this.ensos.forEach(e => e.draw(ctx));
        this.inkParticles.forEach(p => p.draw(ctx));
        this.shards.forEach(s => s.draw(ctx));
        this.crystals.forEach(c => c.draw(ctx));
        this.sublimations.forEach(s => s.draw(ctx));
    }
}