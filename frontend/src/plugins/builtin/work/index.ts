// 工作域内建插件入口
// 汇聚 work 模式下的所有子插件

import type { XOnePlugin } from '@/plugins/types';
import { contractsPlugin } from './contracts';
import { archivesPlugin } from './archives';
import { knowledgePlugin } from './knowledge';
import { dispatchPlugin } from './dispatch';
import { projectPlugin } from './project';

export const WORK_PLUGINS: XOnePlugin[] = [contractsPlugin, archivesPlugin, knowledgePlugin, dispatchPlugin, projectPlugin];

export { contractsPlugin, archivesPlugin, knowledgePlugin, dispatchPlugin, projectPlugin };
