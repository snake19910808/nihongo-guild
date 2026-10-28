#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_schedule.py
生成 2026/11/02 ~ 2027/12/05 完整 398 天（57 週）每日詳細學習課表：
1. data/schedule_398days.json (供 PWA App 讀取)
2. SCHEDULE_398_DAYS.md (供使用者查閱的完整大綱百科)
"""

import os
import sys
import json
from datetime import date, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")

START_DATE = date(2026, 11, 2)
END_DATE = date(2027, 12, 5)

WEEKDAY_ZH = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]

def main():
    # 載入現有資料庫
    with open(os.path.join(DATA_DIR, "kana.json"), "r", encoding="utf-8") as f:
        kana_list = json.load(f)
    with open(os.path.join(DATA_DIR, "kanji.json"), "r", encoding="utf-8") as f:
        kanji_list = json.load(f)
    with open(os.path.join(DATA_DIR, "vocab.json"), "r", encoding="utf-8") as f:
        vocab_list = json.load(f)
    with open(os.path.join(DATA_DIR, "grammar.json"), "r", encoding="utf-8") as f:
        grammar_list = json.load(f)

    # 按照級數分類
    kanji_by_lvl = {"N5": [k for k in kanji_list if k["level"]=="N5"],
                    "N4": [k for k in kanji_list if k["level"]=="N4"],
                    "N3": [k for k in kanji_list if k["level"]=="N3"]}
    vocab_by_lvl = {"N5": [v for v in vocab_list if v["level"]=="N5"],
                    "N4": [v for v in vocab_list if v["level"]=="N4"],
                    "N3": [v for v in vocab_list if v["level"]=="N3"]}
    grammar_by_lvl = {"N5": [g for g in grammar_list if g["level"]=="N5"],
                      "N4": [g for g in grammar_list if g["level"]=="N4"],
                      "N3": [g for g in grammar_list if g["level"]=="N3"]}

    schedule = []
    total_days = (END_DATE - START_DATE).days + 1
    print(f"📅 課表排程天數: {total_days} 天 (從 {START_DATE} 至 {END_DATE})")

    # 課表大對照（出口仁 1~12 課）
    deguchi_lessons = [
        # (課次, 課名, 影片, 出口頁碼, 大家頁碼, 核心主題)
        (1, "初次見面，我姓陳。", "1.mp4", "P018–031", "第 1 課 P28–37", "名詞肯定・否定・疑問句、助詞の"),
        (2, "洋服賣場在哪裡？", "2.mp4", "P032–045", "第 2、3 課 P38–57", "指示代名詞（場所・事物）、價錢詢問"),
        (3, "10點在新宿車站前面見面吧！", "3.mp4", "P046–061", "第 4 課 P60–69", "助詞とにで、邀請～ませんか、時間點"),
        (4, "要怎麼去呢？", "4.mp4", "P062–073", "第 5 課 P70–79", "移動表現（へ・で）、交通工具手段"),
        (5, "假日會做什麼呢？", "5.mp4", "P074–087", "第 6 課 P80–89", "動作受詞を、動詞否定・過去形、副詞修飾"),
        (6, "我想吃壽喜燒。", "6.mp4", "P088–101", "第 8 課 P102–111", "い形容詞・な形容詞用法、願望たい"),
        (7, "這附近有銀行嗎？", "7.mp4", "P102–117", "第 9、10 課 P112–131", "助詞が、理由から、存在句（あります・います）"),
        (8, "旅行時買的土產。", "8.mp4", "P118–131", "第 7 課 P90–99 + 復習B", "副詞もう、助詞に（對象）、授受表現（あげ・もらい）"),
        (9, "決定好要點什麼了嗎？", "9.mp4", "P132–145", "第 11 課 P132–141", "數量詞用法、助詞に（頻率）、限定しか〜ない"),
        (10, "三年前是社會人士。", "10.mp4", "P146–161", "第 12 課前半 P142–146", "名詞・形容詞過去形四時態完整總整理"),
        (11, "台灣比日本溫暖。", "11.mp4", "P162–177", "第 12 課後半 + 復習C", "比較文（より、ほど、どちらが）、最上級一番"),
        (12, "我會去車站接你喔。", "12.mp4", "P178–190", "副詞接續詞總整理 P154–158", "目的表現に、提議ましょうか、同時進行ながら")
    ]

    current_date = START_DATE
    day_num = 1

    # 指針
    k_idx = {"N5": 0, "N4": 0, "N3": 0}
    v_idx = {"N5": 0, "N4": 0, "N3": 0}
    g_idx = {"N5": 0, "N4": 0, "N3": 0}

    while current_date <= END_DATE:
        week_num = (day_num - 1) // 7 + 1
        w_day = current_date.weekday() # 0 = Monday, 6 = Sunday
        w_day_zh = WEEKDAY_ZH[w_day]
        is_sunday = (w_day == 6)

        # 判定章節
        if week_num <= 3:
            chap = 0
            chap_name = "序章：假名村"
            lvl = "N5"
        elif week_num <= 15:
            chap = 1
            chap_name = "第1章：N5 草原"
            lvl = "N5"
        elif week_num <= 29:
            chap = 2
            chap_name = "第2章：N4 森林"
            lvl = "N4"
        elif week_num <= 49:
            chap = 3
            chap_name = "第3章：N3 王城"
            lvl = "N3"
        else:
            chap = 4
            chap_name = "終章：最終決戰"
            lvl = "N3"

        # 每日主線任務規劃
        assigned_kanji = []
        assigned_vocab = []
        assigned_grammar = []
        primary_tb = ""
        secondary_tb = ""
        quest_title = ""
        is_boss = False
        boss_desc = ""

        if chap == 0:
            # 序章（假名村）
            if week_num == 1:
                # 平假名
                if w_day == 0:
                    quest_title = "平假名 あ行、か行、さ行（15字）"
                    primary_tb = "《大家的日本語》P14 筆順、P18 發音"
                    secondary_tb = "出口日語 YouTube 五十音入門影片"
                elif w_day == 1:
                    quest_title = "平假名 た行、な行、は行（15字）"
                    primary_tb = "《大家的日本語》P14–15 筆順"
                elif w_day == 2:
                    quest_title = "平假名 ま行、や行、ら行、わ行、ん（16字）"
                    primary_tb = "《大家的日本語》P15 筆順"
                elif w_day == 3:
                    quest_title = "濁音（がざだば行）與半濁音（ぱ行）（25字）"
                    primary_tb = "《大家的日本語》P18–19 發音說明"
                elif w_day == 4:
                    quest_title = "拗音（きゃ行）、促音（っ）、長音與重音"
                    primary_tb = "《大家的日本語》P19–21 特殊音節"
                elif w_day == 5:
                    quest_title = "教室用語與日常生活招呼語"
                    primary_tb = "《大家的日本語》P22–25 教室用語"
                elif w_day == 6:
                    is_boss = True
                    boss_desc = "週末魔王戰：平假名聽讀寫大考（46清音+25濁音辨識）"
                    quest_title = "🐉 假名村試煉：平假名魔王戰"
            elif week_num == 2:
                # 片假名
                if w_day == 0:
                    quest_title = "片假名 ア行、カ行、サ行（15字）"
                    primary_tb = "《大家的日本語》P16 筆順"
                elif w_day == 1:
                    quest_title = "片假名 タ行、ナ行、ハ行（15字）"
                    primary_tb = "《大家的日本語》P16–17 筆順"
                elif w_day == 2:
                    quest_title = "片假名 マ行、ヤ行、ラ行、ワ行、ン（16字）"
                    primary_tb = "《大家的日本語》P17 筆順"
                elif w_day == 3:
                    quest_title = "片假名濁音、半濁音與長音符號（ー）"
                    primary_tb = "外來語音節練習"
                elif w_day == 4:
                    quest_title = "外來語特殊音（ファ、ティ、ディ等）與生活 30 詞"
                    primary_tb = "外來語日常單字速記"
                elif w_day == 5:
                    quest_title = "數字（1~1萬）、星期與基本時間"
                    primary_tb = "《大家的日本語》P26 數字與時間"
                elif w_day == 6:
                    is_boss = True
                    boss_desc = "週末魔王戰：片假名大考＋平假名混合速讀"
                    quest_title = "🐉 假名村試煉：片假名魔王戰"
            else: # week 3
                if w_day < 5:
                    quest_title = f"發音聽辨強化與入門基礎漢字 (第 {w_day+1} 組)"
                    primary_tb = "五十音實戰單字 100 詞朗讀跟讀"
                    assigned_kanji = [k["kanji"] for k in kanji_by_lvl["N5"][w_day*4:(w_day+1)*4]]
                elif w_day == 5:
                    quest_title = "序章假名村總複習與自我介紹模擬"
                    primary_tb = "向詩織進行公會新人報到登錄"
                else:
                    is_boss = True
                    boss_desc = "序章守門魔王戰：五十音＋20基礎漢字綜合結業考"
                    quest_title = "🐉 序章結業魔王：五十音守門者"

        elif chap == 1:
            # 第 1 章（N5 草原，W4~W15，每週 1 課出口仁）
            lesson_idx = week_num - 4 # 0 ~ 11
            les_info = deguchi_lessons[lesson_idx]
            les_num, les_title, les_video, les_p1, les_p2, les_theme = les_info

            if w_day == 0: # 週一
                quest_title = f"第 {les_num:02d} 課開課：觀看教學影片 {les_video} ＋ 學習目標①"
                primary_tb = f"出口仁初級本 第 {les_num:02d} 課 ({les_p1})，影片 {les_video}"
                secondary_tb = f"大家日本語 {les_p2}"
            elif w_day == 1: # 週二
                quest_title = f"第 {les_num:02d} 課：核心學習目標②句型精熟"
                primary_tb = f"出口仁初級本 第 {les_num:02d} 課 學習目標②"
            elif w_day == 2: # 週三
                quest_title = f"第 {les_num:02d} 課：學習目標③（及④）句型與例句"
                primary_tb = f"出口仁初級本 第 {les_num:02d} 課 學習目標③"
            elif w_day == 3: # 週四
                quest_title = f"第 {les_num:02d} 課：影片複習 ＋ 大家日本語句型實戰"
                primary_tb = f"大家日本語 {les_p2} 文型・例文"
            elif w_day == 4: # 週五
                quest_title = f"第 {les_num:02d} 課：會話跟讀 Shadowing ＋ 練習題刷題"
                primary_tb = f"大家日本語 {les_p2} 会話・練習"
            elif w_day == 5: # 週六
                quest_title = f"第 {les_num:02d} 課：總複習 ＋ 詩織情境對話（{les_theme}）"
                primary_tb = "公會大廳會話練習與 3 句造句批改"
            elif w_day == 6: # 週日
                is_boss = True
                if day_num == 105: # W15 週日
                    boss_desc = "🏆 N5 終極大魔王戰（JLPT N5 完整模擬考，≥70分者取得報考 7 月 N4 資格！）"
                    quest_title = "🏆 第 1 章大魔王：N5 資格認定大決戰"
                else:
                    boss_desc = f"週末魔王戰：第 {les_num:02d} 課文法與單字綜合週測"
                    quest_title = f"🐉 N5 草原魔王：第 {les_num:02d} 課考驗"

            # 分配每日漢字與單字
            if not is_boss:
                assigned_kanji = [k["kanji"] for k in kanji_by_lvl["N5"][k_idx["N5"]:k_idx["N5"]+2]]
                k_idx["N5"] = (k_idx["N5"] + 2) % len(kanji_by_lvl["N5"])
                assigned_vocab = [v["word"] for v in vocab_by_lvl["N5"][v_idx["N5"]:v_idx["N5"]+10]]
                v_idx["N5"] = (v_idx["N5"] + 10) % len(vocab_by_lvl["N5"])
                assigned_grammar = [g["title"] for g in grammar_by_lvl["N5"][g_idx["N5"]:g_idx["N5"]+2]]
                g_idx["N5"] = (g_idx["N5"] + 2) % len(grammar_by_lvl["N5"])

        elif chap == 2:
            # 第 2 章（N4 森林，W16~W29，共 14 週）
            if is_sunday:
                is_boss = True
                quest_title = f"🐉 N4 森林週測：第 {week_num} 週魔王戰"
                boss_desc = "本週 N4 動詞變化與進階句型綜合測驗"
            elif w_day == 5:
                quest_title = f"第 {week_num} 週 N4 句型總複習 ＋ 詩織對話（進階普通形交流）"
                primary_tb = "N4 文法與情境對話"
            else:
                quest_title = f"N4 核心動詞變化與句型研讀 (Day {day_num})"
                primary_tb = "N4 核心機能語解析（て形/た形/普通形/可能/意向/受身/使役）"
                assigned_kanji = [k["kanji"] for k in kanji_by_lvl["N4"][k_idx["N4"]:k_idx["N4"]+2]]
                k_idx["N4"] = (k_idx["N4"] + 2) % len(kanji_by_lvl["N4"])
                assigned_vocab = [v["word"] for v in vocab_by_lvl["N4"][v_idx["N4"]:v_idx["N4"]+10]]
                v_idx["N4"] = (v_idx["N4"] + 10) % len(vocab_by_lvl["N4"])
                assigned_grammar = [g["title"] for g in grammar_by_lvl["N4"][g_idx["N4"]:g_idx["N4"]+2]]
                g_idx["N4"] = (g_idx["N4"] + 2) % len(grammar_by_lvl["N4"])

        elif chap == 3:
            # 第 3 章（N3 王城，W30~W49，共 20 週）
            if week_num in [34, 35] and is_sunday:
                is_boss = True
                quest_title = "🧪 2027/07/04 N4 實戰練兵日（或 N4 中期綜合檢定）"
                boss_desc = "前往實體考場參加 JLPT N4 試驗，或於 App 內完成全真 N4 模擬測驗"
            elif is_sunday:
                is_boss = True
                quest_title = f"🐉 N3 王城週測：第 {week_num} 週魔王戰"
                boss_desc = "N3 讀解長句剖析、聽力對話與中級機能語週測"
            elif w_day == 5:
                quest_title = f"N3 讀解訓練與詩織公會敬語互動 (第 {week_num} 週)"
                primary_tb = "N3 中長篇文章閱讀與敬語實踐"
            else:
                quest_title = f"N3 抽象漢字與中級機能語學習 (Day {day_num})"
                primary_tb = "N3 核心語彙與文法解析（わけ/はず/べき/うちに/わり等）"
                assigned_kanji = [k["kanji"] for k in kanji_by_lvl["N3"][k_idx["N3"]:k_idx["N3"]+3]]
                k_idx["N3"] = (k_idx["N3"] + 3) % len(kanji_by_lvl["N3"])
                assigned_vocab = [v["word"] for v in vocab_by_lvl["N3"][v_idx["N3"]:v_idx["N3"]+15]]
                v_idx["N3"] = (v_idx["N3"] + 15) % len(vocab_by_lvl["N3"])
                assigned_grammar = [g["title"] for g in grammar_by_lvl["N3"][g_idx["N3"]:g_idx["N3"]+2]]
                g_idx["N3"] = (g_idx["N3"] + 2) % len(grammar_by_lvl["N3"])

        else:
            # 終章（最終決戰，W50~W57，共 8 週）
            exam_countdown = (END_DATE - current_date).days
            if current_date == END_DATE:
                is_boss = True
                quest_title = "🏆 2027/12/05 JLPT N3 最終決戰：正式應試日！"
                boss_desc = "走進考場，發揮 398 天的冒險修煉成果，一舉拿下 N3 合格證書！"
            elif is_sunday:
                is_boss = True
                mock_num = week_num - 49
                quest_title = f"🐉 決戰全真模擬考 第 {mock_num} 回（計時 180 分滿分評測）"
                boss_desc = "嚴格按照 JLPT N3 考試時間與題型標準施測，目標分數 ≥ 110 分"
            else:
                quest_title = f"考前弱點狙擊與聽力倍速適應 (倒數 {exam_countdown} 天)"
                primary_tb = "JLPT 官方考古題弱點剖析、聽力 1.2 倍速訓練"

        # 每日固定 6 大子委託
        daily_quests = [
            {"id": "q1", "name": "晨間委託：SRS 記憶卡複習", "minutes": 20, "type": "review", "desc": "複習今日到期的單字與漢字卡片"},
            {"id": "q2", "name": "主線委託：今日新知研讀", "minutes": 40, "type": "main", "desc": f"主教材：{primary_tb}"},
            {"id": "q3", "name": "聽說委託：跟讀與聽力適應", "minutes": 25, "type": "shadowing", "desc": "針對今日句子大聲朗讀跟讀三次"},
            {"id": "q4", "name": "公會委託：與詩織日文交流", "minutes": 15, "type": "chat", "desc": "使用今天所學與詩織對話，獲得好感度"},
            {"id": "q5", "name": "修煉委託：每日三句日文造句", "minutes": 15, "type": "writing", "desc": "動手手寫並造 3 個句子，由詩織批改"},
            {"id": "q6", "name": "睡前委託：RPG 討伐答題戰", "minutes": 5, "type": "battle", "desc": "進行 1~2 場快速打怪答題，賺取 EXP 結算存檔"}
        ]

        day_record = {
            "day": day_num,
            "date": current_date.strftime("%Y-%m-%d"),
            "weekday": w_day_zh,
            "week": week_num,
            "chapter": chap,
            "chapterName": chap_name,
            "level": lvl,
            "title": quest_title,
            "isBossDay": is_boss,
            "bossDescription": boss_desc,
            "textbookPrimary": primary_tb,
            "textbookSecondary": secondary_tb,
            "assignedKanji": assigned_kanji,
            "assignedVocab": assigned_vocab,
            "assignedGrammar": assigned_grammar,
            "dailyQuests": daily_quests
        }

        schedule.append(day_record)
        current_date += timedelta(days=1)
        day_num += 1

    # 輸出 JSON
    schedule_file = os.path.join(DATA_DIR, "schedule_398days.json")
    with open(schedule_file, "w", encoding="utf-8") as f:
        json.dump(schedule, f, ensure_ascii=False, indent=2)
    print(f"✅ schedule_398days.json 輸出成功，共 {len(schedule)} 天！")

    # 輸出 Markdown 大綱百科
    md_file = os.path.join(ROOT_DIR, "SCHEDULE_398_DAYS.md")
    with open(md_file, "w", encoding="utf-8") as f:
        f.write("# 📅 日語 0→N3 冒險者公會 398 天每日全課表 (Curriculum Guide)\n\n")
        f.write("> **起訖日期**：2026-11-02（一）～ 2027-12-05（日）共 57 週、399 天\n")
        f.write("> **目標**：2027/12/05 JLPT N3 高分合格\n\n")
        f.write("---\n\n")
        
        current_week = 0
        for d in schedule:
            if d["week"] != current_week:
                current_week = d["week"]
                f.write(f"\n## 🏰 第 {current_week} 週｜{d['chapterName']}\n")
                f.write("| 天數 | 日期 | 星期 | 今日核心任務 | 課本進度／影片 | 試煉狀態 |\n")
                f.write("|---|---|---|---|---|---|\n")
            
            boss_badge = "🐉 **魔王戰**" if d["isBossDay"] else "一般委託"
            tb_info = d["textbookPrimary"] if d["textbookPrimary"] else "—"
            f.write(f"| Day {d['day']:03d} | {d['date']} | {d['weekday']} | {d['title']} | {tb_info} | {boss_badge} |\n")

    print(f"✅ SCHEDULE_398_DAYS.md 輸出成功！")

if __name__ == "__main__":
    main()
