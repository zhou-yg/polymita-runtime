const {
  app,
  Menu,
  shell,
  BrowserWindow,
  Notification,
} = require('electron');
const isDebug = true || process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

class MenuBuilder {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu() {
    if (isDebug) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment() {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: '检查元素',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDarwinTemplate() {
    const subMenuAbout = {
      label: 'Automan',
      submenu: [
        {
          label: '关于 Automan',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: '隐藏 Automan',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: '隐藏其他应用',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: '显示全部应用', selector: 'unhideAllApplications:' },        
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };

    const subMenuFile = {
      label: '文件',
      submenu: [
        {
          label: '添加项目',
          accelerator: 'Command+O',
          visible: false,
          click: () => {
            // todo ipc通信
          },
        },
      ],
    };

    const subMenuEdit = {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'Command+Z', selector: 'undo:' },
        { label: '重做', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'Command+X', selector: 'cut:' },
        { label: '复制', accelerator: 'Command+C', selector: 'copy:' },
        { label: '粘贴', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: '全选',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
        { type: 'separator' },
        {
          label: '查找',
          accelerator: 'Command+F',
          selector: 'performFindPanelAction:',
        },
        {
          label: '替换',
          accelerator: 'Command+R',
          selector: 'performReplacePanelAction:',
        },
      ],
    };
    const subMenuView = {
      label: '显示',
      submenu: [
        {
          label: '刷新',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: this.mainWindow.isFullScreen() ? '退出全屏' : '全屏',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: '开发者工具',
          accelerator: 'Alt+Command+I',
          enabled: isDebug,
          visible: isDebug,
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };

    const subMenuWindow = {
      label: '窗口',
      submenu: [
        {
          label: '最小化',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: '关闭', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: '前置全部窗口', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp = {
      label: '帮助',
      submenu: [
        {
          label: '文档',
          click() {
            shell.openExternal('https://polymita.cc/doc');
          },
        },
      ],
    };

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '文件',
        submenu: [
          {
            label: '添加项目',
            accelerator: 'Command+O',
            visible: false,
            click: () => {
              // todo ipc通信
            },
          },
          {
            label: '关闭',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '视图',
        submenu: [
          {
            label: '刷新',
            accelerator: 'Ctrl+R',
            click: () => {
              this.mainWindow.webContents.reload();
            },
          },
          {
            label: '全屏',
            accelerator: 'F11',
            click: () => {
              this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
            },
          },
          {
            label: '开发者工具',
            accelerator: 'Alt+Ctrl+I',
            enabled: isDebug,
            visible: isDebug,
            click: () => {
              this.mainWindow.webContents.toggleDevTools();
            },
          },
          {
            label: this.mainWindow.isFullScreen() ? '退出全屏' : '全屏',
            accelerator: 'F11',
            click: () => {
              this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
            },
          },
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '文档',
            click() {
              shell.openExternal(
                'https://polymita.cc/doc',
              );
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}

module.exports.MenuBuilder = MenuBuilder;
