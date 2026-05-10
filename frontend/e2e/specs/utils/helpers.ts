/**
 * i18n 辅助函数
 * 
 * translate(key, locale?) 根据 i18n key 返回对应语言的文本。
 * 当前支持中文(zh)和英文(en)。
 */

const MESSAGES: Record<string, Record<string, string>> = {
  zh: {
    'common.skipToContent': '跳到主内容',
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.login': '登录',
    'auth.loginDescription': '请输入您的账户信息',
    'auth.loginFailed': '登录失败',
    'auth.usernamePlaceholder': '请输入用户名',
    'auth.passwordPlaceholder': '请输入密码',
    'nav.personal': '个人模式',
    'nav.work': '工作模式',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.empty': '暂无数据',
    'common.close': '关闭',
    'dashboard.personal.greeting': '欢迎回来',
    'dashboard.personal.subtitle': '这里是您的个人生活管理中心',
    'dashboard.personal.quickActions': '快速操作',
    'dashboard.personal.recentActivity': '最近活动',
    'dashboard.rightPanel.title': '模块分布',
    'dashboard.rightPanel.chartTitle': '活动日历',
  },
  en: {
    'common.skipToContent': 'Skip to main content',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.login': 'Sign in',
    'auth.loginDescription': 'Enter your account credentials',
    'auth.loginFailed': 'Login failed',
    'auth.usernamePlaceholder': 'Enter username',
    'auth.passwordPlaceholder': 'Enter password',
    'nav.personal': 'Personal',
    'nav.work': 'Work',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.empty': 'No data',
    'common.close': 'Close',
    'dashboard.personal.greeting': 'Welcome back',
    'dashboard.personal.subtitle': 'Your personal life management center',
    'dashboard.personal.quickActions': 'Quick actions',
    'dashboard.personal.recentActivity': 'Recent activity',
    'dashboard.rightPanel.title': 'Module distribution',
    'dashboard.rightPanel.chartTitle': 'Activity calendar',
  },
};

export function translate(key: string, locale: string = 'zh'): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES['zh']?.[key] ?? key;
}
