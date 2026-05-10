// 寒霜ストーム (Frost Storm) の演出・ロジック

class FrostCrystal {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 40;
        this.rot = Math.random() * Math.PI;
        this.rotSpeed = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 6 + 4; 
        this.color = Math.random() < 0.5 ? '#b3ffff' : '#80e5ff';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rot += this.rotSpeed;
        this.life--;
        
        // 当たり判定 (Lv5 氷槍の射出)
        enemies.forEach(e => {
            if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + 15) {
                if (Math.random() < 0.2) this.skill.killEnemy(e); 
            }
        });
    }
    draw(ctx, timer) {
        if (this.life <= 0) return;
        ctx.save();
        
        // 軽量化のため lighter や shadowBlur は使用せず、アルファ値で明滅を表現
        ctx.globalAlpha = (this.life / 40) * (0.5 + Math.sin(timer * 0.2) * 0.5);
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        
        ctx.fillStyle = this.color;
        
        // ひし形の氷の欠片（四角形ではなく鋭利な形）
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 2);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size * 2);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

class FrostVortexParticle {
    constructor(angleOffset) {
        this.angleOffset = angleOffset;
        this.dist = 0;
        this.size = Math.random() * 4 + 2;
        this.life = 1.0;
        this.color = Math.random() < 0.5 ? '#a0ffff' : '#00d4ff';
    }
    update(baseAngle, maxRadius) {
        this.dist += 5;
        this.life -= 0.02;
        if (this.dist > maxRadius || this.life <= 0) {
            this.dist = 0;
            this.life = 1.0;
        }
    }
    draw(ctx, px, py, baseAngle) {
        let currentAngle = baseAngle + this.angleOffset + (this.dist * 0.01);
        let x = px + Math.cos(currentAngle) * this.dist;
        let y = py + Math.sin(currentAngle) * this.dist;
        
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.translate(x, y);
        ctx.rotate(currentAngle + Math.PI / 4); // 流れに合わせて回転
        
        ctx.fillStyle = this.color;
        
        // ひし形のパーティクル
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 1.5);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size * 1.5);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

class IceSword {
    constructor(angleOffset) {
        this.angleOffset = angleOffset;
    }
    draw(ctx, px, py, baseAngle) {
        let currentAngle = baseAngle + this.angleOffset;
        let x = px + Math.cos(currentAngle) * 120;
        let y = py + Math.sin(currentAngle) * 120;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(currentAngle + Math.PI/2);
        
        // 万象氷結の巨大結晶
        let grad = ctx.createLinearGradient(0, -40, 0, 40);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#00ffff');
        grad.addColorStop(1, '#0088ff');

        ctx.fillStyle = grad;
        ctx.shadowBlur = 10; // パフォーマンスのため軽減
        ctx.shadowColor = '#00f2ff';
        
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(15, 10);
        ctx.lineTo(0, 35);
        ctx.lineTo(-15, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(5, 10);
        ctx.lineTo(0, 25);
        ctx.lineTo(-5, 10);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

class FrostStormSkill {
    constructor() {
        this.level = 1;
        this.evo4 = null;
        this.evo7 = null;
        
        this.baseAngle = 0;
        this.timer = 0;
        this.crystals = [];
        this.vortexParticles = [];
        this.iceSwords = [];
        
        this.absoluteZeroFlash = 0;
        
        this.updateStats();
    }
    
    updateStats() {
        this.radius = 150;
        this.freezeChance = 0.05; 
        this.freezeDuration = 90; 
        this.damageInterval = 60; 
        this.rotSpeed = 0.02;
        
        if (this.level >= 2) {
            this.radius *= 1.2;
            this.freezeChance = 0.08;
        }
        if (this.level >= 4 && this.evo4 === 'bone_chilling') {
            this.freezeDuration = Math.floor(this.freezeDuration * 1.5);
        }
        if (this.level >= 6) {
            this.rotSpeed = 0.04;
            this.damageInterval = 40;
        }
        
        // 渦エフェクトの準備
        this.vortexParticles = [];
        if (this.level >= 4 && this.evo4 === 'vortex') {
            // パフォーマンスのため適正数に調整
            for(let i=0; i<5; i++) { 
                let offset = (Math.PI * 2 / 5) * i;
                for(let j=0; j<15; j++) {
                    let p = new FrostVortexParticle(offset + (Math.random()-0.5)*0.3);
                    p.dist = Math.random() * this.radius;
                    this.vortexParticles.push(p);
                }
            }
        }
        
        // 万象氷結の結晶(剣)の準備
        this.iceSwords = [];
        if (this.level >= 7 && this.evo7 === 'ice_swords') {
            this.radius = 100; 
            for(let i=0; i<6; i++) {
                this.iceSwords.push(new IceSword((Math.PI * 2 / 6) * i));
            }
        }
        
        // 氷霜の支配者の範囲調整 (弱体化：範囲を狭める)
        if (this.level >= 7 && this.evo7 === 'absolute_zero') {
            this.radius = Math.min(width, height) * 0.4; 
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
    
    freezeEnemy(e) {
        if (!e.isFrozenByFrost) {
            e.originalSpeed = e.speed;
            e.isFrozenByFrost = true;
            e.frostTimer = this.freezeDuration;
            e.speed = 0; 
            
            // Lv5: 氷槍の射出
            if (this.level >= 5) {
                // パーティクル過多を防ぐため数を調整
                for(let i=0; i<2; i++) {
                    this.crystals.push(new FrostCrystal(this, e.x, e.y));
                }
            }
        } else {
            e.frostTimer = this.freezeDuration; 
        }
    }
    
    update() {
        this.baseAngle += this.rotSpeed;
        this.timer++;
        
        // Lv7 絶対零度（弱体化：発動間隔を10秒[600フレーム]に変更）
        if (this.level >= 7 && this.evo7 === 'absolute_zero') {
            if (this.timer % 600 === 0) { 
                this.absoluteZeroFlash = 1.0;
                enemies.forEach(e => {
                    const dx = e.x - player.x;
                    const dy = e.y - player.y;
                    if (Math.hypot(dx, dy) < this.radius) {
                        this.freezeEnemy(e);
                    }
                });
            }
        }
        
        this.vortexParticles.forEach(p => p.update(this.baseAngle, this.radius));
        
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            this.crystals[i].update();
            if (this.crystals[i].life <= 0) this.crystals.splice(i, 1);
        }
        
        if (this.absoluteZeroFlash > 0) this.absoluteZeroFlash -= 0.02;

        // Lv7: 万象氷結の結晶の座標を計算
        let swordPositions = [];
        if (this.level >= 7 && this.evo7 === 'ice_swords') {
            for(let i=0; i<6; i++) {
                let currentAngle = this.baseAngle + (Math.PI * 2 / 6) * i;
                let sx = player.x + Math.cos(currentAngle) * 120;
                let sy = player.y + Math.sin(currentAngle) * 120;
                swordPositions.push({x: sx, y: sy});
            }
        }

        // 敵への効果適用
        enemies.forEach(e => {
            let dx = e.x - player.x;
            let dy = e.y - player.y;
            let dist = Math.hypot(dx, dy);

            // 凍結解除の処理
            if (e.isFrozenByFrost) {
                e.frostTimer--;
                if (e.frostTimer <= 0) {
                    e.isFrozenByFrost = false;
                    e.speed = e.originalSpeed || e.speed;
                } else {
                    e.speed = 0; 
                    if (this.level >= 4 && this.evo4 === 'bone_chilling') {
                        if (Math.random() < 0.01) this.killEnemy(e); 
                    }
                }
            }
            
            // Lv7: 万象氷結 (結晶の正確な当たり判定)
            if (this.level >= 7 && this.evo7 === 'ice_swords') {
                for(let pos of swordPositions) {
                    if (Math.hypot(e.x - pos.x, e.y - pos.y) < e.radius + 30) {
                        this.killEnemy(e); 
                        break;
                    }
                }
            }

            // フィールド内の処理
            if (dist < this.radius) {
                if (this.timer % this.damageInterval === 0 && Math.random() < this.freezeChance) {
                    this.freezeEnemy(e);
                }
                
                if (this.level >= 3 && !e.isFrozenByFrost && !e.isStunnedByCrimson && !e.isSlowedByHolySeal) {
                    e.speed = (e.originalSpeed || e.speed) * 0.8;
                    e.isSlowedByFrost = true;
                }
                
                if (this.level >= 4 && this.evo4 === 'vortex') {
                    // ★ガリガリで1度凍った敵は、もうガリガリでは凍らない
                    if (!e.hasBeenFrozenByVortex) {
                        let angle = Math.atan2(dy, dx);
                        if (angle < 0) angle += Math.PI * 2;
                        
                        for(let i=0; i<5; i++) {
                            let vAngle = (this.baseAngle + (Math.PI * 2 / 5) * i) % (Math.PI * 2);
                            if (vAngle < 0) vAngle += Math.PI * 2;
                            
                            if (Math.abs(angle - vAngle) < 0.2 || Math.abs(angle - vAngle) > Math.PI*2 - 0.2) {
                                this.freezeEnemy(e);
                                e.hasBeenFrozenByVortex = true; // ガリガリによる凍結フラグを付与
                                break;
                            }
                        }
                    }
                }
                
                if (this.timer % this.damageInterval === 0) {
                    if (Math.random() < 0.1) this.killEnemy(e);
                }
            } else {
                if (e.isSlowedByFrost && !e.isFrozenByFrost) {
                    e.speed = e.originalSpeed || e.speed;
                    e.isSlowedByFrost = false;
                }
            }
        });
    }
    
    draw(ctx) {
        if (this.absoluteZeroFlash > 0) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = `rgba(200, 240, 255, ${this.absoluteZeroFlash})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        // 凍結フィールドの描画 (うっすら明滅)
        let alphaMod = 0.2 + Math.sin(this.timer * 0.05) * 0.05;
        let grad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, this.radius);
        grad.addColorStop(0, `rgba(0, 150, 255, ${alphaMod})`);
        grad.addColorStop(0.8, 'rgba(0, 50, 150, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(player.x, player.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // ひし形の渦エフェクト描画
        this.vortexParticles.forEach(p => p.draw(ctx, player.x, player.y, this.baseAngle));
        this.crystals.forEach(c => c.draw(ctx, this.timer));
        this.iceSwords.forEach(s => s.draw(ctx, player.x, player.y, this.baseAngle));
        
        // 凍結中の敵の軽量描画 (重いshadowBlurを無効化し、色で表現)
        enemies.forEach(e => {
            if (e.isFrozenByFrost) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#0a2a3a';
                ctx.strokeStyle = '#80ffff';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        });
    }
}