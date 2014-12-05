/*
Script: automove.js
    The client-side javascript code for the automove plugin.

Copyright:
    (C) Thibault Person 2009 <thibaultperson@gmail.com>
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 3, or (at your option)
    any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, write to:
        The Free Software Foundation, Inc.,
        51 Franklin Street, Fifth Floor
        Boston, MA  02110-1301, USA.

    In addition, as a special exception, the copyright holders give
    permission to link the code of portions of this program with the OpenSSL
    library.
    You must obey the GNU General Public License in all respects for all of
    the code used other than OpenSSL. If you modify file(s) with this
    exception, you may extend this exception to your version of the file(s),
    but you are not obligated to do so. If you do not wish to do so, delete
    this exception statement from your version. If you delete this exception
    statement from all source files in the program, then also delete it here.
*/

Ext.namespace('Deluge.plugins.automove.ui');
Ext.namespace('Deluge.plugins.automove.util');


if (typeof (console) === 'undefined') {
  console = {
    log: function() {}
  };
}


Deluge.plugins.automove.PLUGIN_NAME = 'automove';
Deluge.plugins.automove.MODULE_NAME = 'automove';
Deluge.plugins.automove.DISPLAY_NAME = _('AutoMove');


Deluge.plugins.automove.util.dictLength = function(dict) {
  var i = 0;

  for (var key in dict) {
    if (dict.hasOwnProperty(key)) {
      i++;
    }
  }

  return i;
};


Deluge.plugins.automove.util.dictEquals = function(a, b) {
  if (a === b) {
    return true;
  }

  if (Deluge.plugins.automove.util.dictLength(a) !=
      Deluge.plugins.automove.util.dictLength(b)) {
    return false;
  }

  for (var key in a) {
    if (!a.hasOwnProperty(key)) {
      continue;
    }

    if (!b.hasOwnProperty(key) || a[key] != b[key]) {
      return false;
    }
  }

  return true;
};


Deluge.plugins.automove.ui.PreferencePage = Ext.extend(Ext.Panel, {

  title: Deluge.plugins.automove.DISPLAY_NAME,

  layout: {
    type: 'vbox',
    align: 'stretch'
  },

  initComponent: function() {
    Deluge.plugins.automove.ui.PreferencePage.superclass.initComponent.call(
      this);

    this.tblTrackers = this.add({
      xtype: 'editorgrid',
      margins: '0 5 0 5',
      flex: 1,
      autoExpandColumn: 'url',
      viewConfig: {
        emptyText: _('Loading trackers...'),
        deferEmptyText: false
      },

      colModel: new Ext.grid.ColumnModel({
        columns: [
          {
            id: 'url',
            header: _('Url'),
            dataIndex: 'url',
            sortable: true,
            hideable: false
          },
          {
            id: 'dst',
            header: _('Dst'),
            dataIndex: 'dst',
            hideable: false,
            width: 120,
          },
          {
            id: 'cmd',
            header: _('Command'),
            dataIndex: 'cmd',
            width: 120
          }
        ]
      }),
      selModel: new Ext.grid.RowSelectionModel({
                singleSelect: false,
                moveEditorOnEnter: false
      }),

      store: new Ext.data.ArrayStore({
        autoDestroy: true,

        fields: [
          {name: 'url'},
          {name: 'dst'},
          {name: 'cmd'}
        ]
      }),

      setEmptyText: function(text) {
        if (this.viewReady) {
          this.getView().emptyText = text;
          this.getView().refresh();
        } else {
          Ext.apply(this.viewConfig, {emptyText: text});
        }
      },

      loadData: function(data) {
        this.getStore().loadData(data);
        if (this.viewReady) {
          this.getView().updateHeaders();
        }
      }
    });

    this.buttonsContainer = this.add({
      xtype: 'container',
      layout: 'hbox',
      margins: '4 0 0 5',
      items: [{
          xtype: 'button',
          text: 'New rule',
          iconCls: 'icon-add',
          margins: '0 8 0 0'
        }, {
          xtype: 'button',
          text: 'Edit rule',
          iconCls: 'icon-edit',
          margins: '0 8 0 0'
        }, {
          xtype: 'button',
          text: 'Delete rule',
          iconCls: 'icon-delete'
        }
      ]
    });

    this.buttonsContainer.getComponent(0).setHandler(this.addTracker, this);
    this.buttonsContainer.getComponent(1).setHandler(this.editTracker, this);
    this.buttonsContainer.getComponent(2).setHandler(this.removeTracker, this);

    deluge.preferences.on('show', this.loadPrefs, this);
    deluge.preferences.buttons[1].on('click', this.savePrefs, this);
    deluge.preferences.buttons[2].on('click', this.savePrefs, this);

    this.waitForClient(10);
  },

  onDestroy: function() {
    deluge.preferences.un('show', this.loadPrefs, this);
    deluge.preferences.buttons[1].un('click', this.savePrefs, this);
    deluge.preferences.buttons[2].un('click', this.savePrefs, this);

    Deluge.plugins.automove.ui.PreferencePage.superclass.onDestroy.call(this);
  },

  waitForClient: function(triesLeft) {
    if (triesLeft < 1) {
      this.tblTrackers.setEmptyText(_('Unable to load settings'));
      return;
    }

    if (deluge.login.isVisible() || !deluge.client.core ||
        !deluge.client.automove) {
      var self = this;
      var t = deluge.login.isVisible() ? triesLeft : triesLeft-1;
      setTimeout(function() { self.waitForClient.apply(self, [t]); }, 1000);
    } else if (!this.isDestroyed) {
      this.loadPrefs();
    }
  },

  loadPrefs: function() {
    if (deluge.preferences.isVisible()) {
      this._loadPrefs1();
    }
  },

  _loadPrefs1: function() {
    deluge.client.automove.get_config({
      success: function(prefs) {
        this.preferences = prefs;
        this.loadTrackers(prefs['trackers']);
      },
      scope: this
    });
  },



   addTracker: function(){
    this.createForm('','','', null);

  },

  createForm: function(url, dst, cmd, row){

    this.dialog = {
      init: function(parent, url, dst, cmd, row){
        this.parent = parent;
        this.row = row;
        this.window= new Ext.Window({
            title: 'Edit tracker',
            modal:true,
            resizable : false,
            height: 170,
            width: 450,
            layout: {
              type: 'vbox',
              align: 'stretch'
            }
        });
        this.urlc = this.window.add(
        {xtype: 'container',
          layout: 'hbox',
          margins: '15 0 0 5',
          items: [{
              xtype: 'label',
              text: 'Url tracker* :',
              margins: '5 0 0 0',
              width:100


            },
            {
              xtype: 'field',
              value: url,
              width:320
            }
          ]
        });
        this.dstc = this.window.add(
        {xtype: 'container',
          layout: 'hbox',
          margins: '5 0 0 5',
          items: [{
              xtype: 'label',
              text: 'Destination folder* :',
              margins: '5 0 0 0',
              width: 100
            },
            {
              xtype: 'field',
              value : dst,
              width:320
            }
          ]
        });
        this.cmdc = this.window.add(
        {xtype: 'container',
          layout: 'hbox',
          margins: '5 0 0 5',
          items: [{
              xtype: 'label',
              text: 'Command :',
              margins: '5 0 0 0',
              width:100
            },
            {
              xtype: 'field',
              value: cmd,
              width:320
            }
          ]
        });

        this.buttons = this.window.add({xtype: 'container',
          layout: {
            type:'hbox',
            pack:'end'
          },
          margins: '10 10 0 5',
          items: [
            {
              xtype: 'button',
              text: 'Cancel',
              iconCls: 'icon-back'
            },
            {
              xtype: 'button',
              text: 'Save',
              iconCls: 'icon-ok',
              margins: '0 10 0 0'
            }
          ]
        });

        this.urlc.getComponent(1).on('change', this.isvalid,this);
        this.dstc.getComponent(1).on('change', this.isvalid,this);
        //Save
        this.buttons.getComponent(1).setHandler(this.saveForm, this);
        //Cancel
        this.buttons.getComponent(0).setHandler(this.closeForm, this);
        this.isvalid();
      },

      saveForm: function(){
        console.log("save");
        var u = this.urlc.getComponent(1).getValue();
        var d = this.dstc.getComponent(1).getValue();
        var c = this.cmdc.getComponent(1).getValue();

        var store = this.parent.tblTrackers.getStore();
        if(this.row==null){
          var Tracker = store.recordType;
          var t = new Tracker({
              url: u, dst: d,cmd:c
          });
          this.parent.tblTrackers.stopEditing();
          store.add(t);
          this.parent.tblTrackers.startEditing(0, 0);
        }
        else{
          console.lo
          this.row.set('url', u);
          this.row.set('cmd',c);
          this.row.set('dst', d);
          store.commitChanges();
        }

        this.window.close();
      },

      closeForm: function(){
        this.window.close();
      },

      isvalid: function(){
        var t = this.urlc.getComponent(1).getValue().length>0 && this.dstc.getComponent(1).getValue().length>0 ;
        this.buttons.getComponent(1).setDisabled(!t);
      },

      show: function(){
        this.window.show();
      }
    }
    this.dialog.init(this, url, dst, cmd, row);
    this.dialog.show();

  },

  editTracker: function(){
    var selections = this.tblTrackers.getSelectionModel().getSelections();
    var store = this.tblTrackers.getStore();
    for(var i=0; i<selections.length;i++){
      data = selections[i]['data'];
      this.createForm(data['url'],data['dst'],data['cmd'], selections[i]);
      break;
    }

  },

  removeTracker: function(){
    var selections = this.tblTrackers.getSelectionModel().getSelections();
    var store = this.tblTrackers.getStore();
    for(var i=0; i<selections.length;i++){
      store.remove(selections[i]);
      break;
    }
    store.commitChanges();
  },

  loadTrackers: function(trackers){
    var store = this.tblTrackers.getStore();
    var data=[]
    for (var i = 0; i<trackers.length; i++){
      data.push([trackers[i]['url'],trackers[i]['dst'],trackers[i]['cmd']]);
    }
    this.tblTrackers.loadData(data);

  },

  savePrefs: function() {
    var trackers = [];
    var store = this.tblTrackers.getStore();
    var apply = false;
    store.each(function(row){
      var d = row['data'];
      var r = {url: d['url'], dst: d['dst'], cmd: d['cmd']};
      trackers.push(r);

    },this);
    this.preferences['trackers'] = trackers;
    deluge.client.automove.set_config(this.preferences, {
      success: this.loadPrefs,
      scope: this
    });
  },

});


Deluge.plugins.automove.Plugin = Ext.extend(Deluge.Plugin, {

  name: Deluge.plugins.automove.PLUGIN_NAME,

  onEnable: function() {
    this.prefsPage = new Deluge.plugins.automove.ui.PreferencePage();
    deluge.preferences.addPage(this.prefsPage);

    console.log('%s enabled', Deluge.plugins.automove.PLUGIN_NAME);
  },

  onDisable: function() {
    deluge.preferences.selectPage(_('Plugins'));
    deluge.preferences.removePage(this.prefsPage);
    this.prefsPage.destroy();

    console.log('%s disabled', Deluge.plugins.automove.PLUGIN_NAME);
  }
});

Deluge.registerPlugin(Deluge.plugins.automove.PLUGIN_NAME,
  Deluge.plugins.automove.Plugin);
