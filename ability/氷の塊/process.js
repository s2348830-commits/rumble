// 氷の塊 (Ice Barrage) の演出・ロジック

class IceShard {
    constructor(skill, targetX, targetY, type) {
        this.skill = skill;
        this.tx = targetX;
        this.ty = targetY;
        this.type = type; 
        
        // 落下時間 (Lv1: 0.6s ≒ 36f, Lv2以降: 0.4s ≒ 24f)
        this.maxLife = skill.level >= 2 ? 24 : 36;
        this.life = this.maxLife;
        
        // 落下開始位置（画面外上部）
        this.sx = this.tx + (Math.random() - 0.5) * 100;
        this.sy = this.ty - 600;

        // サイズ調整
        this.size = 1.0;
        if (skill.level >= 2) this.size = 1.2;
        if (type === 'mega') this.size = 2.4;
        if (type === 'ultimate') this.size = 3.6;
    }
    update() {
        this.life--;
        if (this.life <= 0) {
            this.skill.onImpact(this.tx, this.ty, this.type);
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        let progress = 1 - (this.life / this.maxLife);
        let x = this.sx + (this.tx - this.sx) * progress;
        let y = this.sy + (this.ty - this.sy) * progress;

        ctx.save();
        ctx.translate(x, y);
        let angle = Math.atan2(this.ty - this.sy, this.tx - this.sx);
        ctx.rotate(angle + Math.PI/2);
        ctx.scale(this.size, this.size);

        // 高品質な氷の結晶描画
        let grad = ctx.createLinearGradient(0, -25, 0, 25);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#0099ff');
        
        ctx.fillStyle = grad;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 153, 255, 0.6)';
        
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(10, -10);
        ctx.lineTo(6, 25);
        ctx.lineTo(0, 35);
        ctx.lineTo(-6, 25);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.fill();

        // ハイライト
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(4, -10);
        ctx.lineTo(0, 25);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

class IceFragment {
    constructor(x, y, angle, speed, size) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.size = size;
        this.rot = Math.random() * Math.PI;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.93; this.vy *= 0.93;
        this.life -= 0.03;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.fillStyle = '#e0faff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0099ff';
        // ひし形
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class IceRipple {
    constructor(x, y, maxRadius) {
        this.x = x; this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.life = 1.0;
    }
    update() {
        this.radius += (this.maxRadius - this.radius) * 0.15;
        this.life -= 0.04;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0099ff';
        ctx.stroke();
        ctx.restore();
    }
}

class IceFog {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x; this.y = y;
        this.life = 120; // 2秒
        this.radius = 80;
    }
    update() {
        this.life--;
        if (this.life % 20 === 0) {
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < this.radius + e.radius) {
                    if (Math.random() < 0.4) this.skill.killEnemy(e);
                }
            });
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = (this.life / 120) * 0.4;
        let grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#00ccff');
        grad.addColorStop(1, 'rgba(0, 204, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

class IceFissure {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x; this.y = y;
        this.life = 60; // 1秒
        this.angle = Math.random() * Math.PI * 2;
        this.length = Math.max(width, height) * 1.5; // 画面端まで
        
        // ギザギザのパスを事前生成
        this.points = [];
        let currentX = 0;
        while(currentX < this.length) {
            let step = Math.random() * 50 + 30;
            currentX += step;
            let offset = (Math.random() - 0.5) * 40;
            this.points.push({x: currentX, y: offset});
        }
    }
    update() {
        if (this.life === 59) {
            let dx = Math.cos(this.angle);
            let dy = Math.sin(this.angle);
            enemies.forEach(e => {
                let px = e.x - this.x;
                let py = e.y - this.y;
                let proj = px * dx + py * dy;
                if (proj > 0 && proj < this.length) {
                    let dist = Math.abs(px * dy - py * dx);
                    if (dist < 60) { 
                        this.skill.killEnemy(e); // 軌道上を即死
                    }
                }
            });
        }
        this.life--;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life / 60;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.lineWidth = 12;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        this.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00ccff';
        ctx.stroke();
        ctx.restore();
    }
}

class IceBarrageSkill {
    constructor() {
        this.level = 1;
        this.evo4 = null;
        this.evo7 = null;
        
        this.baseInterval = 75; // 1.2s (1200ms)
        this.timer = 0;
        
        this.shards = [];
        this.fragments = [];
        this.ripples = [];
        this.fogs = [];
        this.fissures = [];
        
        this.shootQueue = [];
        this.globalFreezeTimer = 0;
        this.kills = 0;
    }
    
    levelUp(branch) {
        this.level++;
        if (this.level === 4 && branch) this.evo4 = branch;
        if (this.level === 7 && branch) this.evo7 = branch;
    }
    
    killEnemy(e) {
        const index = enemies.indexOf(e);
        if (index > -1) {
            expGems.push(new ExpGem(e.x, e.y, 5));
            enemies.splice(index, 1);
            
            // Lv6 魔力循環
            if (this.level >= 6) {
                this.kills++;
                // 1キルごとに約50ms(3フレーム)短縮。最大600ms(37フレーム)
                this.baseInterval = Math.max(37, 75 - (this.kills * 3)); 
            }
        }
    }
    
    onImpact(x, y, type) {
        // 破片生成
        let fragCount = this.level >= 3 ? 20 : 12;
        let speedMult = this.level >= 3 ? 15 : 10;
        for(let i=0; i<fragCount; i++) {
            let angle = (Math.PI * 2 / fragCount) * i + Math.random() * 0.2;
            let speed = Math.random() * speedMult + 5;
            this.fragments.push(new IceFragment(x, y, angle, speed, type === 'mega' ? 8 : 5));
        }

        // Ripple生成
        let rippleRadius = type === 'mega' ? 180 : 80;
        if (type === 'ultimate') rippleRadius = 250;
        this.ripples.push(new IceRipple(x, y, rippleRadius));
        
        // 当たり判定
        enemies.forEach(e => {
            if (Math.hypot(e.x - x, e.y - y) < rippleRadius + e.radius) {
                this.killEnemy(e);
            }
        });
        
        // Lv5 冷気の霧
        if (this.level >= 5 && type !== 'rain') {
            this.fogs.push(new IceFog(this, x, y));
        }
        
        // Lv7 凍死領域の亀裂
        if (type === 'ultimate') {
            this.fissures.push(new IceFissure(this, x, y));
        }
    }
    
    update() {
        this.timer++;
        
        // キューの処理（時間差発射）
        if (this.shootQueue.length > 0) {
            let q = this.shootQueue[0];
            if (this.timer >= q.time) {
                this.shards.push(new IceShard(this, q.x, q.y, q.type));
                this.shootQueue.shift();
            }
        }

        // 停止エフェクト強制解除用
        enemies.forEach(e => {
            if (e.isStunnedByIceBarrage) {
                e.speed = e.originalSpeed || e.speed;
                e.isStunnedByIceBarrage = false;
            }
        });

        // 零度崩壊の全体フリーズ処理
        if (this.globalFreezeTimer > 0) {
            this.globalFreezeTimer--;
            enemies.forEach(e => {
                // 1度このスキルで凍結したことがある敵は無視する
                if (!e.hasBeenFrozenByCollapsePast) {
                    e.originalSpeed = e.speed;
                    e.speed = 0;
                    e.isStunnedByIceBarrage = true;
                    e.isCollapseTargetNow = true; // 現在のフリーズ対象としてマーク
                }
            });

            // フリーズ期間が終了した瞬間に、対象だった敵に「フリーズ済み」フラグを付与
            if (this.globalFreezeTimer <= 0) {
                enemies.forEach(e => {
                    if (e.isCollapseTargetNow) {
                        e.hasBeenFrozenByCollapsePast = true;
                        e.isCollapseTargetNow = false;
                    }
                });
            }
        }

        // 定期発動
        if (this.shootQueue.length === 0 && this.timer >= this.baseInterval) {
            this.timer = 0;
            
            // ロックオンする敵を1体決める (画面内にいる敵からランダム)
            let baseTarget = null;
            if (enemies.length > 0) {
                baseTarget = enemies[Math.floor(Math.random() * enemies.length)];
            } else {
                baseTarget = { x: player.x, y: player.y };
            }

            if (this.level >= 7 && this.evo7 === 'absolute_collapse') {
                // 零度崩壊の雨処理は下部の毎フレーム処理で行うためここはスキップ
            } else if (this.level >= 7 && this.evo7 === 'death_domain') {
                // 凍死領域: HP最大の敵へ
                let target = null;
                let maxHp = -1;
                enemies.forEach(e => {
                    let hp = e.hp || e.maxHp || 10;
                    if (hp > maxHp) { maxHp = hp; target = e; }
                });
                if (!target) target = baseTarget;
                for(let i=0; i<5; i++) {
                    this.shootQueue.push({ time: this.timer + i*3, x: target.x + (Math.random()-0.5)*30, y: target.y + (Math.random()-0.5)*30, type: 'ultimate' });
                }
            } else if (this.level >= 4 && this.evo4 === 'great_freeze') {
                // 大氷結: 5連射メガサイズ、1体に集中して降る
                for(let i=0; i<5; i++) {
                    this.shootQueue.push({ time: this.timer + i*10, x: baseTarget.x + (Math.random()-0.5)*30, y: baseTarget.y + (Math.random()-0.5)*30, type: 'mega' });
                }
            } else if (this.level >= 4 && this.evo4 === 'spiral_frost') {
                // スパイラル・フロスト: 8連射螺旋。ターゲットの周囲に渦を巻くように降る
                for(let i=0; i<8; i++) {
                    let offset = Math.sin(i) * 30;
                    let angle = i * (Math.PI*2/8) + Date.now()*0.001;
                    let radius = 60 + i*10;
                    let tx = baseTarget.x + Math.cos(angle)*radius + offset;
                    let ty = baseTarget.y + Math.sin(angle)*radius + offset;
                    this.shootQueue.push({ time: this.timer + i*6, x: tx, y: ty, type: 'spiral' });
                }
            } else {
                // Lv1-3: 3連射、1体に集中して降る
                for(let i=0; i<3; i++) {
                    this.shootQueue.push({ time: this.timer + i*10, x: baseTarget.x + (Math.random()-0.5)*30, y: baseTarget.y + (Math.random()-0.5)*30, type: 'normal' });
                }
            }
        }
        
        // 零度崩壊の特殊処理（絶え間ない雨と3秒ごとのフラッシュ）
        if (this.level >= 7 && this.evo7 === 'absolute_collapse') {
            if (this.timer % 3 === 0) { // 0.05秒間隔
                let tx = player.x + (Math.random() - 0.5) * width * 1.5;
                let ty = player.y + (Math.random() - 0.5) * height * 1.5;
                this.shards.push(new IceShard(this, tx, ty, 'rain'));
            }
            if (this.timer % 180 === 0) { // 3秒ごと
                this.globalFreezeTimer = 60; // 1秒間停止
            }
        }
        
        // 要素の更新と削除
        [this.shards, this.fragments, this.ripples, this.fogs, this.fissures].forEach(arr => {
            for(let i = arr.length - 1; i >= 0; i--) {
                arr[i].update();
                if (arr[i].life <= 0) arr.splice(i, 1);
            }
        });
    }
    
    draw(ctx) {
        if (this.globalFreezeTimer > 0) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = `rgba(200, 240, 255, ${this.globalFreezeTimer / 60 * 0.5})`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        this.fogs.forEach(f => f.draw(ctx));
        this.fissures.forEach(f => f.draw(ctx));
        this.ripples.forEach(r => r.draw(ctx));
        this.fragments.forEach(f => f.draw(ctx));
        this.shards.forEach(s => s.draw(ctx));
    }
}