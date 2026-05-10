#!/usr/bin/env python3
"""
大规模批量 i18n 替换脚本
项目: XOne Frontend

功能:
1. 读取 zh.json / en.json 构建逆向索引 (中文 → key)
2. 扫描目标文件中的非注释中文字符串
3. 已有 key 的 → 替换为 t('key')
4. 缺 key 的 → 生成新 key，同时写入 zh.json / en.json
5. 处理 STATUS_MAP / 表单验证 / JSX内容 / 模板字符串
6. 不碰注释
"""

import os
import re
import json
import sys
from pathlib import Path
from collections import OrderedDict

# ─── 配置 ─────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ZH_JSON_PATH = PROJECT_ROOT / "messages" / "zh.json"
EN_JSON_PATH = PROJECT_ROOT / "messages" / "en.json"

# 需要处理的目标文件 (相对 PROJECT_ROOT)
TARGET_FILES = [
    # A. Dashboard 页面 (高优先级)
    "src/app/[locale]/personal/dashboard/page.tsx",
    "src/app/[locale]/work/dashboard/page.tsx",

    # B. 业务插件 — archives (7 files)
    "src/plugins/builtin/work/archives/ArchiveList.tsx",
    "src/plugins/builtin/work/archives/ArchiveDetail.tsx",
    "src/plugins/builtin/work/archives/ArchiveForm.tsx",
    "src/plugins/builtin/work/archives/AppraisalList.tsx",
    "src/plugins/builtin/work/archives/BorrowForm.tsx",
    "src/plugins/builtin/work/archives/BorrowList.tsx",
    "src/plugins/builtin/work/archives/StorageManager.tsx",

    # B. 业务插件 — contracts (8 files)
    "src/plugins/builtin/work/contracts/ContractList.tsx",
    "src/plugins/builtin/work/contracts/ContractForm.tsx",
    "src/plugins/builtin/work/contracts/ContractDetail.tsx",
    "src/plugins/builtin/work/contracts/ClassificationManager.tsx",
    "src/plugins/builtin/work/contracts/CategoryManager.tsx",
    "src/plugins/builtin/work/contracts/FondsManager.tsx",
    "src/plugins/builtin/work/contracts/MilestoneTable.tsx",
    "src/plugins/builtin/work/contracts/Timeline.tsx",

    # B. 业务插件 — dispatch (3 files)
    "src/plugins/builtin/work/dispatch/DataSourceList.tsx",
    "src/plugins/builtin/work/dispatch/TaskList.tsx",
    "src/plugins/builtin/work/dispatch/MonitorPanel.tsx",

    # B. 业务插件 — project (3 files)
    "src/plugins/builtin/work/project/MilestoneList.tsx",
    "src/plugins/builtin/work/project/KanbanBoard.tsx",
    "src/plugins/builtin/work/project/GanttChart.tsx",

    # C. 其他
    "src/plugins/builtin/personal/shopping/Dashboard.tsx",
]

# 新增 key 时自动生成的模块名前缀映射 (基于文件路径)
MODULE_PREFIX_MAP = {
    "archives": "archives",
    "contracts": "contracts",
    "dispatch": "dispatch",
    "project": "project",
    "shopping": "shopping",
    "personal/dashboard": "dashboard.personal",
    "work/dashboard": "dashboard.work",
}

# 不需要翻译的中文（如：日志、技术标识符、URL参数等）
SKIP_PATTERNS = [
    r'console\.',
    r'// @ts-',
    r'\\u[0-9a-fA-F]{4}',
]


def load_json(path: Path) -> dict:
    """加载 JSON 文件，保持键顺序"""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=OrderedDict)


def save_json(path: Path, data: dict):
    """保存 JSON 文件，保持格式美观"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def flatten_keys(obj: dict, prefix: str = "") -> dict:
    """将嵌套 JSON 扁平化为 {完整key路径: 中文值}"""
    result = OrderedDict()
    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(flatten_keys(value, full_key))
        elif isinstance(value, list):
            # 数组不扁平化，记录为整体
            result[full_key] = json.dumps(value, ensure_ascii=False)
        elif isinstance(value, str):
            result[full_key] = value
        else:
            result[full_key] = str(value) if value is not None else ""
    return result


def build_reverse_index(zh_flat: dict) -> dict:
    """构建中文文本 → key 的逆向索引 (取首个匹配)"""
    index = {}
    for key, value in zh_flat.items():
        if isinstance(value, str) and value.strip():
            # 只索引纯中文字符串（或含中文的字符串），避免英文key冲突
            if re.search(r'[\u4e00-\u9fff]', value):
                if value not in index:
                    index[value] = key
    return index


def contains_chinese(text: str) -> bool:
    """检查字符串是否包含中文"""
    return bool(re.search(r'[\u4e00-\u9fff]', text))


def is_inside_comment(lines: list[str], line_idx: int, col_start: int, col_end: int) -> bool:
    """
    检查指定位置是否在注释内。
    支持: // 行注释, /* */ 块注释, JSX {/* */} 注释
    
    返回 (is_comment: bool, is_jsx_comment: bool)
    """
    # 简化的行级检查
    line = lines[line_idx]
    
    # 检查是否在 // 注释中
    double_slash = line.find('//')
    if double_slash != -1 and col_start >= double_slash:
        return True, False
    
    # 检查是否在 {/* */} JSX 注释中
    jsx_comment_start = line.find('{/*')
    jsx_comment_end = line.find('*/}')
    if jsx_comment_start != -1:
        if jsx_comment_end != -1 and col_start >= jsx_comment_start and col_start <= jsx_comment_end + 2:
            return True, True
        elif col_start >= jsx_comment_start:
            return True, True
    
    # 检查 /* */ 块注释 - 简化处理
    block_start = line.find('/*')
    if block_start != -1 and '*/}' not in line[block_start:block_start+5]:
        block_end = line.find('*/')
        if block_end != -1 and col_start >= block_start and col_start <= block_end + 1:
            return True, False
        elif block_end == -1 and col_start >= block_start:
            return True, False
    
    return False, False


def get_module_prefix(file_path: str) -> str:
    """根据文件路径推断模块名前缀"""
    rel = file_path.replace("src/plugins/builtin/work/", "").\
                    replace("src/plugins/builtin/personal/", "").\
                    replace("src/plugins/personal/", "").\
                    replace("src/app/[locale]/", "")
    
    # 提取模块名
    for module in ["archives", "contracts", "dispatch", "project", "shopping"]:
        if module in rel.split("/"):
            return module
    
    if "personal/dashboard" in rel:
        return "dashboard.personal"
    if "work/dashboard" in rel:
        return "dashboard.work"
    
    return "common"


def generate_new_key(chinese_text: str, module_prefix: str, existing_keys: set) -> str:
    """
    为中文文本生成新的 i18n key。
    策略:
    1. 从已有的 en.json 值反查 (如果英文值匹配已有key，复用)
    2. 基于中文文本语义生成简短英文key
    3. 保证 key 不重复
    
    返回: 如 "archives.status.active"
    """
    # 从中文文本提取可能的英文关键词 (简单规则)
    # 例如: "档案管理" → "archives", "新增" → "add", "删除" → "delete"
    
    # 常见中文→英文映射
    WORD_MAP = {
        # 通用操作
        "新增": "add", "添加": "add", "创建": "create", "新建": "create",
        "编辑": "edit", "修改": "edit",
        "删除": "delete", "移除": "remove",
        "保存": "save", "取消": "cancel", "确认": "confirm",
        "搜索": "search", "筛选": "filter", "排序": "sort",
        "导出": "export", "导入": "import", "上传": "upload", "下载": "download",
        "刷新": "refresh", "重置": "reset", "清空": "clear",
        "提交": "submit", "审批": "approve", "退回": "reject",
        
        # 状态
        "草稿": "draft", "已签署": "signed", "履行中": "inProgress", "生效中": "active",
        "已完成": "completed", "已终止": "terminated", "已到期": "expired",
        "已归档": "archived", "已借出": "borrowed", "在库": "active",
        "已销毁": "destroyed", "进行中": "inProgress", "已延期": "delayed",
        "待启动": "pending", "待审批": "pendingApproval",
        "公开": "public", "内部": "internal", "秘密": "secret", "机密": "confidential",
        "永久": "permanent", "长期": "longTerm", "短期": "shortTerm",
        "启用": "enabled", "停用": "disabled", "就绪": "ready", "处理中": "processing",
        
        # 合同相关
        "合同": "contract", "合同编号": "contractNo", "合同名称": "contractName",
        "签约方": "party", "金额": "amount", "类型": "type",
        "开始日期": "startDate", "结束日期": "endDate",
        "合同总数": "totalContracts", "即将到期": "expiringSoon",
        "里程碑": "milestone", "付款计划": "paymentSchedule",
        
        # 档案相关
        "档案": "archive", "档案编号": "archiveNo",
        "全宗": "fonds", "分类": "category",
        "密级": "securityLevel", "保管期限": "retentionPeriod",
        "借阅": "borrow", "归还": "return",
        "鉴定": "appraisal", "销毁": "destroy",
        "档案柜": "cabinet", "档案盒": "box",
        
        # 调度相关
        "数据源": "dataSource", "任务": "task",
        "调度": "dispatch", "监控": "monitor",
        "执行日志": "executionLogs",
        "上次同步": "lastSync", "立即同步": "syncNow",
        "运行": "run", "查看日志": "viewLog",
        
        # 项目管理
        "项目": "project", "项目名称": "projectName",
        "进度": "progress", "截止日期": "deadline",
        "成员": "members", "描述": "description",
        "看板": "kanban", "甘特图": "ganttChart",
        
        # 表单相关
        "名称": "name", "标题": "title", "备注": "notes",
        "状态": "status", "标签": "tags",
        "请输入": "placeholder",
        "必填": "required", "不能为空": "required",
        "请输入有效": "invalid",
        "确认删除": "deleteTitle",
        "此操作无法撤销": "deleteConfirm",
        "确定要删除": "deleteConfirm",
        
        # 其他
        "共": "total", "条": "items", "个": "count",
        "页": "page", "第": "pageNum",
        "未找到": "notFound", "暂无数据": "empty", "暂无": "empty",
        "加载中": "loading", "保存中": "saving", "删除中": "deleting",
        "操作": "actions", "详情": "detail", "查看": "view",
        "关闭": "close", "返回": "back", "重试": "retry",
        "成功": "success", "失败": "fail", "错误": "error",
    }
    
    # 尝试精确匹配
    if chinese_text in WORD_MAP:
        suffix = WORD_MAP[chinese_text]
    else:
        # 尝试从文本中匹配已知模式
        suffix = None
        for cn, en in WORD_MAP.items():
            if cn in chinese_text:
                suffix = en
                break
        if suffix is None:
            # 生成基于拼音的简短key (简化)
            import hashlib
            h = hashlib.md5(chinese_text.encode()).hexdigest()[:8]
            suffix = f"k{h}"
    
    # 构建完整 key
    base_key = f"{module_prefix}.{suffix}"
    
    # 确保 key 不重复
    if base_key not in existing_keys:
        return base_key
    
    # 如果重复，加数字后缀
    i = 2
    while f"{base_key}{i}" in existing_keys:
        i += 1
    return f"{base_key}{i}"


def auto_translate_to_en(chinese_text: str) -> str:
    """
    将中文自动翻译为英文。
    优先使用精确映射表，其次使用启发式规则。
    这是一个占位翻译，后续可以人工修正。
    """
    TRANSLATE_MAP = {
        # 通用操作
        "新增": "Add", "添加": "Add", "创建": "Create", "新建": "Create",
        "编辑": "Edit", "修改": "Edit",
        "删除": "Delete", "移除": "Remove",
        "保存": "Save", "取消": "Cancel", "确认": "Confirm",
        "搜索": "Search", "筛选": "Filter", "排序": "Sort",
        "导出": "Export", "导入": "Import", "上传": "Upload", "下载": "Download",
        "刷新": "Refresh", "重置": "Reset", "清空": "Clear",
        "提交": "Submit", "审批": "Approve", "退回": "Reject",
        "查看": "View", "详情": "Detail", "操作": "Actions",
        "关闭": "Close", "返回": "Back", "重试": "Retry",
        "成功": "Success", "失败": "Failed", "错误": "Error",
        "加载中": "Loading...", "保存中": "Saving...", "删除中": "Deleting...",
        "暂无数据": "No data", "暂无": "None",
        "确认删除": "Confirm Delete",
        "此操作无法撤销": "This action cannot be undone.",
        "未找到": "Not found",
        "全部": "All", "无": "None",
        "是": "Yes", "否": "No",
        "名称": "Name", "标题": "Title", "状态": "Status",
        "类型": "Type", "备注": "Notes", "描述": "Description",
        "标签": "Tags", "分类": "Category",
        "金额": "Amount", "价格": "Price", "数量": "Quantity",
        "开始日期": "Start Date", "结束日期": "End Date",
        "截止日期": "Deadline",
        "请输入": "Please enter",
        "不能为空": "cannot be empty",
        "必须": "must be",
        "至少": "at least",
        "有效": "valid",
        "确定要删除": "Are you sure you want to delete",
        "删除后不可恢复": "This action is irreversible.",
        
        # 状态
        "草稿": "Draft", "已签署": "Signed", "履行中": "In Progress",
        "生效中": "Active", "已完成": "Completed", "已终止": "Terminated",
        "已到期": "Expired", "已归档": "Archived", "已借出": "Borrowed",
        "在库": "In Stock", "已销毁": "Destroyed",
        "进行中": "In Progress", "已延期": "Delayed",
        "待启动": "Pending", "待审批": "Pending Approval",
        "公开": "Public", "内部": "Internal", "秘密": "Secret", "机密": "Confidential",
        "永久": "Permanent", "长期": "Long Term", "短期": "Short Term",
        "启用": "Enabled", "停用": "Disabled", "就绪": "Ready", "处理中": "Processing",
        "待购": "Pending", "已购": "Purchased", "取消": "Cancelled",
        "生效": "Active", "到期": "Expired",
        
        # 合同
        "合同": "Contract", "合同编号": "Contract No.",
        "合同名称": "Contract Name", "签约方": "Counterparty",
        "合同总数": "Total Contracts", "即将到期": "Expiring Soon",
        "合同详情": "Contract Details", "新增合同": "New Contract",
        "里程碑": "Milestones", "付款计划": "Payment Schedule",
        "分类管理": "Category Management",
        "全宗管理": "Fonds Management",
        
        # 档案
        "档案": "Archive", "档案编号": "Archive No.",
        "全宗": "Fonds", "密级": "Security Level",
        "保管期限": "Retention Period",
        "借阅": "Borrow", "归还": "Return",
        "鉴定": "Appraisal", "销毁": "Destroy",
        "档案柜": "Cabinet", "档案盒": "Box",
        "档案总数": "Total Archives", "借出中": "Borrowed",
        "档案管理": "Archive Management",
        
        # 调度
        "数据源": "Data Source", "任务": "Task",
        "调度": "Dispatch", "监控": "Monitor",
        "执行日志": "Execution Logs",
        "上次同步": "Last Sync", "立即同步": "Sync Now",
        "运行": "Run", "查看日志": "View Log",
        "数据报送": "Data Dispatch",
        "同步频率": "Sync Frequency",
        "新建任务": "New Task", "编辑任务": "Edit Task",
        
        # 项目
        "项目": "Project", "项目名称": "Project Name",
        "进度": "Progress",
        "成员": "Members",
        "看板": "Kanban Board", "甘特图": "Gantt Chart",
        "项目管理": "Project Management",
        "新建项目": "New Project", "编辑项目": "Edit Project",
        "创建项目": "Create Project", "暂无项目": "No Projects",
        "选择项目": "Select Project",
        "项目进度": "Project Progress",
        
        # 购物
        "购物清单": "Shopping List", "添加商品": "Add Item",
        "编辑商品": "Edit Item", "商品名称": "Item Name",
        "商品总数": "Total Items", "已购买": "Purchased",
        "待购买": "Pending", "本月预算": "Monthly Budget",
        "购买渠道": "Purchase Channel",
        "预算管理": "Budget Management", "设置预算": "Set Budget",
        "剩余": "Remaining", "已用": "Spent", "超预算": "Over Budget",
        "添加预算": "Add Budget", "暂无预算": "No Budgets",
        
        # Dashboard
        "快捷入口": "Quick Actions", "最近活动": "Recent Activity",
        "今日概览": "Today's Overview", "任务分配": "Task Distribution",
        "今日活动": "Today's Activity",
        "工作台": "Workspace",
        "常用功能": "Quick Access",
        "项目管理与团队协作概览": "Project Management & Team Collaboration Overview",
        "生活与工作的数字中枢": "Your Digital Hub for Life & Work",
        
        # 财务
        "总资产": "Total Assets", "本月结余": "Monthly Balance",
        "本月收益": "Monthly Return", "本月新增": "New This Month",
        "较上周": "vs Last Week", "较上月": "vs Last Month",
        "当前": "Current", "今日运动(分钟)": "Today's Exercise (min)",
        "今日消耗(千卡)": "Today's Burn (kcal)",
        "待购项": "Pending Items", "已读本": "Books Read",
        "在看部": "Watching", "本月天": "Days This Month",
    }
    
    if chinese_text in TRANSLATE_MAP:
        return TRANSLATE_MAP[chinese_text]
    
    # 如果文本包含已知模式，尝试组合翻译
    for cn, en in sorted(TRANSLATE_MAP.items(), key=lambda x: -len(x[0])):
        if cn in chinese_text:
            # 简单替换
            remaining = chinese_text.replace(cn, "").strip()
            if not remaining:
                return en
            else:
                return f"{en} {remaining}"
    
    # 最后fallback: 直接返回中文原文（标记为需要人工翻译）
    return f"[TODO] {chinese_text}"


def extract_chinese_strings(file_path: str) -> list[dict]:
    """
    从 .tsx/.ts 文件中扫描所有非注释的中文字符串。
    
    返回: [
        {
            "line": 行号,
            "col_start": 起始列,
            "col_end": 结束列,
            "text": 中文文本,
            "quote_type": 引号类型 ("single", "double", "backtick", "jsx_text"),
            "context": 上下文类型 ("string", "jsx_content", "object_value", "status_map"),
            "original_line": 原始行内容,
            "full_match": 完整匹配文本 (含引号),
        },
        ...
    ]
    """
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        lines = content.split("\n")
    
    results = []
    
    # ── 策略1: 匹配引号字符串中的中文 ──
    # 单引号字符串: '...'
    pattern_single = re.compile(r"'([^'\\]*(?:\\.[^'\\]*)*)'")
    # 双引号字符串: "..."
    pattern_double = re.compile(r'"([^"\\]*(?:\\.[^"\\]*)*)"')
    # 模板字符串: `...`
    pattern_backtick = re.compile(r'`([^`\\]*(?:\\.[^`\\]*)*)`')
    
    for line_idx, line in enumerate(lines):
        # 跳过整行注释
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("// ") or stripped.startswith("#"):
            continue
        
        # 匹配双引号字符串
        for m in pattern_double.finditer(line):
            inner = m.group(1)
            if contains_chinese(inner):
                col_start = m.start()
                col_end = m.end()
                is_cmt, is_jsx = is_inside_comment(lines, line_idx, col_start, col_end)
                if not is_cmt and not is_jsx:
                    results.append({
                        "line": line_idx,
                        "col_start": col_start,
                        "col_end": col_end,
                        "text": inner,
                        "quote_type": "double",
                        "context": "string",
                        "original_line": line,
                        "full_match": m.group(0),
                    })
        
        # 匹配单引号字符串 (注意避开 JSX props 中的单引号)
        for m in pattern_single.finditer(line):
            inner = m.group(1)
            if contains_chinese(inner):
                col_start = m.start()
                col_end = m.end()
                is_cmt, is_jsx = is_inside_comment(lines, line_idx, col_start, col_end)
                if not is_cmt and not is_jsx:
                    # 检查是否在 JSX 属性中 (如 className='')
                    before = line[:col_start]
                    if re.search(r'=\s*$', before):
                        continue  # 跳过 JSX prop 中的单引号字符串
                    results.append({
                        "line": line_idx,
                        "col_start": col_start,
                        "col_end": col_end,
                        "text": inner,
                        "quote_type": "single",
                        "context": "string",
                        "original_line": line,
                        "full_match": m.group(0),
                    })
        
        # 匹配模板字符串
        for m in pattern_backtick.finditer(line):
            inner = m.group(1)
            if contains_chinese(inner):
                col_start = m.start()
                col_end = m.end()
                is_cmt, is_jsx = is_inside_comment(lines, line_idx, col_start, col_end)
                if not is_cmt and not is_jsx:
                    results.append({
                        "line": line_idx,
                        "col_start": col_start,
                        "col_end": col_end,
                        "text": inner,
                        "quote_type": "backtick",
                        "context": "string",
                        "original_line": line,
                        "full_match": m.group(0),
                    })
    
    # ── 策略2: 匹配 JSX 文本内容中的中文 (标签之间) ──
    # >中文文本< 或 </Tag>中文文本< 或 { condition ? '中文' : '...' }
    # 这个比较复杂，使用简化方法: 检测行内 >中文< 模式
    jsx_text_pattern = re.compile(r'>([^<>{]*[\u4e00-\u9fff][^<>{]*)<')
    
    for line_idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("// "):
            continue
        
        # 跳过 import 语句
        if stripped.startswith("import "):
            continue
        
        for m in jsx_text_pattern.finditer(line):
            content = m.group(1)
            # 提取纯中文文本(去除前后空白)
            chinese_part = content.strip()
            if not contains_chinese(chinese_part):
                continue
            
            col_start = m.start() + 1  # '>' 之后
            col_end = m.end() - 1      # '<' 之前
            is_cmt, is_jsx = is_inside_comment(lines, line_idx, col_start, col_end)
            if not is_cmt and not is_jsx:
                # 检查是否已经是 t() 调用
                full_content = m.group(0)
                if 't(' in full_content:
                    continue
                results.append({
                    "line": line_idx,
                    "col_start": col_start,
                    "col_end": col_end,
                    "text": chinese_part,
                    "quote_type": "jsx_text",
                    "context": "jsx_content",
                    "original_line": line,
                    "full_match": m.group(0),
                })
    
    return results


def replace_chinese_in_file(
    file_path: str,
    reverse_index: dict,
    new_keys_map: dict,
    stats: dict,
    dry_run: bool = False,
) -> tuple[str, int]:
    """
    替换单个文件中的中文为 t() 调用。
    
    返回: (新内容, 替换数量)
    """
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        lines = content.split("\n")
    
    matches = extract_chinese_strings(str(file_path))
    
    if not matches:
        return content, 0
    
    # 反向排序 (从后往前替换，避免位置偏移)
    matches.sort(key=lambda x: (x["line"], x["col_start"]), reverse=True)
    
    module_prefix = get_module_prefix(str(file_path))
    existing_keys = set(reverse_index.values())
    existing_keys.update(set(new_keys_map.values()))  # 包括本次新增的
    
    # 检测文件是否已有 useTranslations
    has_use_translations = "useTranslations" in content
    has_t_variable = bool(re.search(r'\bconst\s+t\s*=\s*useTranslations', content))
    has_t_hook = "const t = useTranslations()" in content or "const t = useTranslations();" in content
    
    replacements_made = 0
    needs_t_hook = False
    
    for m in matches:
        chinese_text = m["text"]
        line_idx = m["line"]
        line = lines[line_idx]
        
        # 跳过已有 t() 包裹的
        if m["quote_type"] == "jsx_text":
            full_content = m["full_match"]
            if 't(' in full_content or '{t(' in full_content:
                continue
        
        # 查找匹配的 i18n key
        i18n_key = None
        if chinese_text in reverse_index:
            i18n_key = reverse_index[chinese_text]
        elif chinese_text in new_keys_map:
            i18n_key = new_keys_map[chinese_text]
        else:
            # 新 key
            i18n_key = generate_new_key(chinese_text, module_prefix, existing_keys)
            new_keys_map[chinese_text] = i18n_key
            existing_keys.add(i18n_key)
        
        needs_t_hook = True
        
        # 执行替换
        if m["quote_type"] in ("single", "double"):
            # 字符串字面量 → 替换为 t('key')
            old_str = m["full_match"]
            new_str = f"t('{i18n_key}')"
            # 直接替换整个引号字符串为 t() 调用
            # 但如果字符串包含插值变量，保留原样
            if "${" in old_str or "{" in chinese_text.replace("\\{", ""):
                continue  # 跳过模板变量，留给人工处理
            line = line[:m["col_start"]] + new_str + line[m["col_end"]:]
        elif m["quote_type"] == "backtick":
            # 模板字符串 → 如包含变量则跳过，否则替换
            # 先检查原始模板字符串
            full = m["full_match"]
            if "${" in full:
                continue  # 有变量的模板字符串，跳过复杂处理
            new_str = f"t('{i18n_key}')"
            line = line[:m["col_start"]] + new_str + line[m["col_end"]:]
        elif m["quote_type"] == "jsx_text":
            # JSX 文本内容 → 包裹为 {t('key')}
            full_match = m["full_match"]
            # 结构: >中文< → 替换为 >{t('key')}<
            indented_text = m["text"]
            
            # 寻找周围的 > 和 <
            gt_pos = line.rfind(">", 0, m["col_start"])
            lt_pos = line.find("<", m["col_end"] - m["text"].__len__() + len(full_match) - 1)
            if lt_pos == -1:
                lt_pos = line.find("<", m["col_end"] + 1)
            
            if gt_pos != -1 and lt_pos != -1:
                # 提取中间内容
                between = line[gt_pos+1:lt_pos]
                # 只替换中文部分
                actual_text = m["text"]
                
                # 如果整个between就只是这个中文文本
                if between.strip() == actual_text:
                    leading_space = between[:len(between) - len(between.lstrip())]
                    trailing_space = between[len(between.rstrip()):]
                    new_between = f"{leading_space}{{t('{i18n_key}')}}{trailing_space}"
                    line = line[:gt_pos+1] + new_between + line[lt_pos:]
                else:
                    # 部分替换 - 在between中用 {t()} 替换中文
                    new_between = between.replace(actual_text, f"{{t('{i18n_key}')}}")
                    line = line[:gt_pos+1] + new_between + line[lt_pos:]
        
        if line != lines[line_idx]:
            lines[line_idx] = line
            replacements_made += 1
    
    new_content = "\n".join(lines)
    
    # 如果做了替换但缺少 t 变量声明，自动添加
    if needs_t_hook and not has_t_variable:
        # 查找 use client 或 import 区域后插入
        import_lines = []
        t_insert_pos = 0
        for i, line in enumerate(lines):
            if line.startswith("import ") and "useTranslations" in line:
                has_use_translations = True
        if not has_use_translations:
            # 在最后一个 import 后添加
            last_import = 0
            for i, line in enumerate(lines):
                if line.startswith("import "):
                    last_import = i
            if last_import > 0:
                lines.insert(last_import + 1, "import { useTranslations } from 'next-intl';")
                t_insert_pos = last_import + 1
        
        # 在组件函数内添加 const t = useTranslations();
        if not has_t_hook:
            # 查找 export default function 或 function 组件
            for i in range(t_insert_pos, len(lines)):
                line = lines[i]
                if re.search(r'(export\s+default\s+)?function\s+\w+', line):
                    # 找到函数定义，在函数体开始处插入
                    # 找到下一行的 {
                    for j in range(i, min(i + 10, len(lines))):
                        if "{" in lines[j]:
                            indent = len(lines[j]) - len(lines[j].lstrip())
                            lines.insert(j + 1, " " * (indent + 2) + "const t = useTranslations();")
                            break
                    break
    
    new_content = "\n".join(lines)
    return new_content, replacements_made


def main():
    """主函数"""
    print("=" * 60)
    print("  XOne Frontend - 大规模 i18n 批量替换脚本")
    print("=" * 60)
    print()
    
    # 1. 加载现有 i18n 数据
    print("[1/5] 加载 i18n JSON 文件...")
    zh_data = load_json(ZH_JSON_PATH)
    en_data = load_json(EN_JSON_PATH)
    zh_flat = flatten_keys(zh_data)
    en_flat = flatten_keys(en_data)
    print(f"      zh.json: {len(zh_flat)} 个 key")
    print(f"      en.json: {len(en_flat)} 个 key")
    
    # 2. 构建逆向索引
    print("[2/5] 构建逆向索引 (中文 → key)...")
    reverse_index = build_reverse_index(zh_flat)
    print(f"      逆向索引: {len(reverse_index)} 个中文条目")
    
    # 3. 处理目标文件
    print("[3/5] 处理目标文件...")
    new_keys_map = {}  # chinese_text → i18n_key (本次新增)
    file_stats = {}
    total_replacements = 0
    total_new_keys = 0
    
    for rel_path in TARGET_FILES:
        full_path = PROJECT_ROOT / rel_path
        if not full_path.exists():
            print(f"      ⚠ 文件不存在: {rel_path}")
            continue
        
        print(f"      处理: {rel_path}")
        new_content, count = replace_chinese_in_file(
            str(full_path),
            reverse_index,
            new_keys_map,
            {},
        )
        
        if count > 0:
            # 写回文件
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            file_stats[rel_path] = count
            total_replacements += count
            print(f"        ✓ 替换了 {count} 处中文")
        else:
            print(f"        - 无需要替换的内容")
    
    print(f"\n      总计: {total_replacements} 处替换, {len(new_keys_map) - total_new_keys} 个新 key")
    
    # 4. 更新 JSON 文件
    print("[4/5] 更新 i18n JSON 文件...")
    new_keys_added = 0
    
    for chinese_text, i18n_key in new_keys_map.items():
        if i18n_key not in zh_flat:
            # 将 key 写入 zh.json
            zh_data = set_nested_key(zh_data, i18n_key, chinese_text)
            new_keys_added += 1
            
            # 将 key 写入 en.json (自动翻译)
            en_value = auto_translate_to_en(chinese_text)
            en_data = set_nested_key(en_data, i18n_key, en_value)
    
    save_json(ZH_JSON_PATH, zh_data)
    save_json(EN_JSON_PATH, en_data)
    print(f"      新增 {new_keys_added} 个 key 到 zh.json 和 en.json")
    
    # 5. 输出结果
    print("[5/5] 输出结果:")
    print()
    print("-" * 60)
    print("替换文件列表:")
    for fp, count in sorted(file_stats.items()):
        print(f"  {count:>4} 处 → {fp}")
    print("-" * 60)
    print(f"总计替换: {total_replacements} 处")
    print(f"新增 i18n key: {new_keys_added} 个")
    print()
    print("✅ 脚本执行完成。请运行 npm run build 验证。")
    
    return total_replacements, new_keys_added


def set_nested_key(data: dict, key_path: str, value: str) -> dict:
    """设置嵌套 JSON key"""
    parts = key_path.split(".")
    current = data
    for part in parts[:-1]:
        if part not in current:
            current[part] = OrderedDict()
        current = current[part]
    current[parts[-1]] = value
    return data


if __name__ == "__main__":
    main()
