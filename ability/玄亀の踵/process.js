// 玄亀の踵 (Black Turtle's Heel - Calligraphy Skill) の演出・ロジック

class InkParticle {
    constructor(skill, x, y, speed, size, pierce) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = size;
        this.life = 1.0;
        this.pierce = pierce; // 貫通力
        this.hitEnemies = [];
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // 墨が少し垂れるような重力
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life -= 0.02;
        
        // 当たり判定
        if (this.life > 0) {
            enemies.forEach(e => {
                if (!this.hitEnemies.includes(e) && Math.hypot(e.x - this.x, e.y - this.y) < e.radius + this.size * 2) {
                    this.hitEnemies.push(e);
                    // 防御力低下（Lv5裏打ちの加護）を受けているとダメージ確率増幅
                    let killChance = 0.1;
                    if (e.isDefDownByGenki) killChance = 0.3;
                    
                    if (Math.random() < killChance) {
                        this.skill.killEnemy(e);
                    }
                    if (!this.pierce) this.life = 0; // 貫通しない場合は消滅
                }
            });
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = `rgba(15, 15, 15, ${this.life})`;
        // 飛沫の軌跡（伸びる形）
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class EnsoCircle {
    constructor(skill, x, y, radius, drawSpeed, duration, hasTrap) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.drawSpeed = drawSpeed; // Lv2 渇筆で向上
        this.maxDuration = duration;
        this.duration = duration;
        this.hasTrap = hasTrap; // Lv3 墨痕の残留
        
        this.progress = 0;
        this.completed = false;
        
        // Lv6 吸引用
        this.attracting = false;

        // 丸の中のダメージ判定用タイマーを追加
        this.timer = 0;
    }
    update() {
        this.timer++;

        // ★追加：丸（円）の内側にいる敵に継続ダメージと確率即死を与える
        if (this.timer % 15 === 0) {
            // ループ中の敵削除（killEnemy）によるインデックスずれを防ぐため後ろから回す
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                // 敵が丸の中にいるか判定
                if (dist < this.radius) {
                    e.hp -= 15; // 継続ダメージ
                    if (e.hp <= 0) {
                        this.skill.killEnemy(e);
                    } else {
                        // 確率で即死させる処理
                        let killChance = 0.05;
                        if (e.isDefDownByGenki) killChance = 0.15;
                        if (Math.random() < killChance) {
                            this.skill.killEnemy(e);
                        }
                    }
                }
            }
        }

        if (this.progress < Math.PI * 2) {
            this.progress += this.drawSpeed;
            if (this.progress >= Math.PI * 2) {
                this.progress = Math.PI * 2;
                this.completed = true;
                this.skill.onEnsoCompleted(this.x, this.y);
            }
        } else {
            this.duration--;
            
            // Lv6 墨の芳香（吸引）
            if (this.attracting && this.duration > 0) {
                enemies.forEach(e => {
                    const dist = Math.hypot(e.x - this.x, e.y - this.y);
                    if (dist < this.radius * 2) {
                        e.x += (this.x - e.x) * 0.05;
                        e.y += (this.y - e.y) * 0.05;
                    }
                });
            }

            // Lv3 墨痕の残留（鈍足化）
            if (this.hasTrap && this.duration > 0) {
                enemies.forEach(e => {
                    const dist = Math.hypot(e.x - this.x, e.y - this.y);
                    // 円周上に触れているか
                    if (Math.abs(dist - this.radius) < 20) {
                        if (!e.isStunnedByCrimson && !e.isFrozenByFrost) {
                            e.speed = (e.originalSpeed || e.speed) * 0.4;
                            e.isSlowedByGenki = true;
                        }
                    } else if (e.isSlowedByGenki) {
                        e.speed = e.originalSpeed || e.speed;
                        e.isSlowedByGenki = false;
                    }
                });
            }
        }
    }
    draw(ctx) {
        if (this.duration <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-Math.PI / 2);
        
        ctx.strokeStyle = `rgba(10, 10, 10, ${Math.min(1, this.duration / 30)})`;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, this.progress);
        ctx.stroke();

        // 渇筆の表現（内側に細いかすれ線）
        ctx.strokeStyle = `rgba(30, 30, 30, ${Math.min(0.6, this.duration / 30)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 5, 0, this.progress);
        ctx.stroke();
        
        ctx.restore();
    }
}

class RakkanStamp {
    constructor(skill, x, y, size) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.size = size;
        this.life = 40;
        
        // 着弾時の判定（即死級）
        enemies.forEach(e => {
            if (Math.hypot(e.x - this.x, e.y - this.y) < this.size * 1.5) {
                this.skill.killEnemy(e);
            }
        });
    }
    update() {
        this.life--;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 巨大な印鑑（落款）
        ctx.fillStyle = `rgba(180, 20, 20, ${Math.min(1, this.life / 20)})`;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.8, this.life / 20)})`;
        ctx.lineWidth = 2;
        // 印鑑の中の文字風模様
        ctx.beginPath();
        ctx.moveTo(-this.size*0.3, -this.size*0.3);
        ctx.lineTo(this.size*0.3, this.size*0.3);
        ctx.moveTo(this.size*0.3, -this.size*0.3);
        ctx.lineTo(-this.size*0.3, this.size*0.3);
        ctx.stroke();
        
        ctx.restore();
    }
}

class GenkiTrail {
    constructor(skill, x, y) {
        this.skill = skill;
        this.x = x;
        this.y = y;
        this.life = 180; // 3秒残る
        this.size = 15;
        this.timer = 0;
    }
    update() {
        this.life--;
        this.timer++;
        
        // 常に小飛沫を出し続ける
        if (this.timer % 10 === 0) {
            this.skill.particles.push(new InkParticle(this.skill, this.x, this.y, 4, 3, true));
        }
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.fillStyle = `rgba(15, 15, 15, ${this.life / 180})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class GenkiNoKakatoSkill {
    constructor() {
        this.level = 1;
        this.evo4 = null;
        this.evo7 = null;
        
        this.baseInterval = 180; // 3秒
        this.timer = 0;
        
        this.ensos = [];
        this.particles = [];
        this.stamps = [];
        this.trails = [];
        
        this.stampQueue = [];
        
        this.lastPlayerPos = { x: player.x, y: player.y };
        
        // Lv7 玄武踏撃用の全体エフェクト
        this.genbuBlastTimer = 0;
        
        this.updateStats();
    }
    
    updateStats() {
        this.drawSpeed = 0.15;
        this.splashSpeed = 8;
        this.pierce = false;
        this.ensoDuration = 30; // 0.5秒
        this.hasTrap = false;
        this.particleCount = 15;
        
        if (this.level >= 2) {
            this.drawSpeed = 0.15 * 1.3; // 1.3倍
            this.splashSpeed = 12;
            this.pierce = true;
        }
        if (this.level >= 3) {
            this.ensoDuration = 120; // 2秒
            this.hasTrap = true;
        }
        if (this.level >= 4) {
            if (this.evo4 === 'ranboku') {
                this.particleCount = 30; // 乱墨：飛沫2倍
            }
        }
    }
    
    levelUp(branch) {
        this.level++;
        if (this.level === 4 && branch) this.evo4 = branch;
        if (this.level === 7 && branch) this.evo7 = branch;
        this.updateStats();
    }
    
    killEnemy(e) {
        const index = enemies.indexOf(e);
        if (index > -1) {
            expGems.push(new ExpGem(e.x, e.y, 5));
            enemies.splice(index, 1);
        }
    }
    
    onEnsoCompleted(x, y) {
        // 円相完成時に墨を落として飛沫を飛ばす
        let count = this.particleCount;
        let isFocus = (this.level >= 4 && this.evo4 === 'focus');
        if (isFocus) count = 5; // 一点集中：飛沫減少
        
        for (let i = 0; i < count; i++) {
            let spd = Math.random() * this.splashSpeed + 2;
            this.particles.push(new InkParticle(this, x, y, spd, Math.random() * 4 + 3, this.pierce));
        }

        if (isFocus) {
            // 落款4回連続スタンプの予約
            for (let i = 0; i < 4; i++) {
                this.stampQueue.push({ x: x + (Math.random()-0.5)*80, y: y + (Math.random()-0.5)*80, time: this.timer + i * 15 });
            }
        }
    }
    
    update() {
        this.timer++;
        
        // Lv5: 裏打ちの加護（防御力低下結界）
        if (this.level >= 5) {
            enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) < 180) {
                    e.isDefDownByGenki = true;
                } else {
                    e.isDefDownByGenki = false;
                }
            });
        }

        // Lv7 腐敗神化（自動発動停止＆軌跡生成）
        if (this.level >= 7 && this.evo7 === 'fuhai') {
            const distMoved = Math.hypot(player.x - this.lastPlayerPos.x, player.y - this.lastPlayerPos.y);
            if (distMoved > 20) {
                this.trails.push(new GenkiTrail(this, player.x, player.y));
                this.lastPlayerPos = { x: player.x, y: player.y };
            }
            
            // 数秒ごとに軌跡をなぞる亀の足跡（落款）
            if (this.timer % 120 === 0 && this.trails.length > 0) {
                let targetTrail = this.trails[Math.floor(Math.random() * this.trails.length)];
                this.stamps.push(new RakkanStamp(this, targetTrail.x, targetTrail.y, 100));
            }
        } else {
            // 通常の定期発動
            if (this.timer % this.baseInterval === 0) {
                if (this.level >= 7 && this.evo7 === 'genbu') {
                    // 玄武踏撃: 四隅に円相
                    const w = width / 2; const h = height / 2;
                    const corners = [
                        {x: player.x - w + 100, y: player.y - h + 100},
                        {x: player.x + w - 100, y: player.y - h + 100},
                        {x: player.x - w + 100, y: player.y + h - 100},
                        {x: player.x + w - 100, y: player.y + h - 100}
                    ];
                    corners.forEach(c => {
                        let enso = new EnsoCircle(this, c.x, c.y, 60, this.drawSpeed, this.ensoDuration, this.hasTrap);
                        if (this.level >= 6) enso.attracting = true;
                        this.ensos.push(enso);
                    });
                    
                    // 1秒後に中央で巨大爆発
                    this.genbuBlastTimer = 60;
                } else {
                    // 通常発動
                    let tx = player.x + (Math.random() - 0.5) * 300;
                    let ty = player.y + (Math.random() - 0.5) * 300;
                    if (enemies.length > 0) {
                        let e = enemies[Math.floor(Math.random() * enemies.length)];
                        tx = e.x; ty = e.y;
                    }
                    let enso = new EnsoCircle(this, tx, ty, 80, this.drawSpeed, this.ensoDuration, this.hasTrap);
                    if (this.level >= 6) enso.attracting = true; // Lv6 墨の芳香
                    this.ensos.push(enso);
                }
            }
        }

        // 玄武踏撃の爆発処理
        if (this.genbuBlastTimer > 0) {
            this.genbuBlastTimer--;
            if (this.genbuBlastTimer <= 0) {
                // 全画面に致命的ダメージ＆完全凍結
                enemies.forEach(e => {
                    if (Math.random() < 0.6) {
                        this.killEnemy(e);
                    } else {
                        // 生き残った敵を凍結拘束
                        e.originalSpeed = e.speed;
                        e.speed = 0;
                        e.isStunnedByCrimson = true; // 流用して拘束
                    }
                });
                // 背景演出用にフラッシュタイマーをセット
                this.blackFlash = 30;
                
                // 大量の墨飛沫
                for(let i=0; i<50; i++) {
                    this.particles.push(new InkParticle(this, player.x, player.y, Math.random()*20+5, Math.random()*8+4, true));
                }
            }
        }

        if (this.blackFlash > 0) this.blackFlash--;

        // スタンプ予約の処理
        for (let i = this.stampQueue.length - 1; i >= 0; i--) {
            let q = this.stampQueue[i];
            if (this.timer >= q.time) {
                this.stamps.push(new RakkanStamp(this, q.x, q.y, 80));
                this.stampQueue.splice(i, 1);
            }
        }

        // 要素の更新と削除
        [this.ensos, this.particles, this.stamps, this.trails].forEach(arr => {
            for (let i = arr.length - 1; i >= 0; i--) {
                arr[i].update();
                if (arr[i].duration <= 0 || arr[i].life <= 0) {
                    arr.splice(i, 1);
                }
            }
        });
    }
    
    draw(ctx) {
        // Lv5 裏打ちの加護 (結界)
        if (this.level >= 5) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(this.timer * 0.01);
            // 和紙風の結界
            ctx.fillStyle = `rgba(240, 235, 220, 0.15)`;
            ctx.strokeStyle = `rgba(0, 0, 0, 0.2)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, 180, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Lv7 玄武踏撃の全画面黒染め＋白抜き文字エフェクト
        if (this.blackFlash > 0) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = `rgba(10, 10, 10, ${this.blackFlash / 30})`;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${(this.blackFlash / 30)})`;
            ctx.font = "bold 120px serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("玄 武", width/2, height/2);
            ctx.restore();
        }

        this.trails.forEach(t => t.draw(ctx));
        this.ensos.forEach(e => e.draw(ctx));
        this.stamps.forEach(s => s.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
    }
}