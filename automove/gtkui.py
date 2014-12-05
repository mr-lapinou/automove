#
# gtkui.py
#
# Copyright (C) 2009 Thibault Person <thibaultperson@gmail.com>
#
# Basic plugin template created by:
# Copyright (C) 2008 Martijn Voncken <mvoncken@gmail.com>
# Copyright (C) 2007-2009 Andrew Resch <andrewresch@gmail.com>
# Copyright (C) 2009 Damien Churchill <damoxc@gmail.com>
#
# Deluge is free software.
#
# You may redistribute it and/or modify it under the terms of the
# GNU General Public License, as published by the Free Software
# Foundation; either version 3 of the License, or (at your option)
# any later version.
#
# deluge is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with deluge.    If not, write to:
# 	The Free Software Foundation, Inc.,
# 	51 Franklin Street, Fifth Floor
# 	Boston, MA  02110-1301, USA.
#
#    In addition, as a special exception, the copyright holders give
#    permission to link the code of portions of this program with the OpenSSL
#    library.
#    You must obey the GNU General Public License in all respects for all of
#    the code used other than OpenSSL. If you modify file(s) with this
#    exception, you may extend this exception to your version of the file(s),
#    but you are not obligated to do so. If you do not wish to do so, delete
#    this exception statement from your version. If you delete this exception
#    statement from all source files in the program, then also delete it here.
#

import gtk

from deluge.log import LOG as log
from deluge.ui.client import client
from deluge.plugins.pluginbase import GtkPluginBase
import deluge.component as component
import deluge.common

from common import get_resource


class TrackerDialog(gtk.Dialog):
	def __init__(self, parent, tracker="", dest="", command=""):
		gtk.Dialog.__init__(self, "Tracker rule edit" , parent, 0,
			(gtk.STOCK_CANCEL, gtk.RESPONSE_CANCEL,
			gtk.STOCK_OK, gtk.RESPONSE_OK))
		self.set_default_size(400,150)
		box = self.get_content_area()
		vbox = gtk.VBox()

		hbox_url = gtk.HBox()
		lbl_url = gtk.Label("Tracker URL*: ")
		self.txt_url = gtk.Entry()
		self.set_tracker(tracker)
		self.txt_url.connect("changed", self.entrychanged)
		hbox_url.pack_start(lbl_url,False, False, 5)
		hbox_url.pack_start(self.txt_url,True, True, 5)
		vbox.pack_start(hbox_url,False, False, 5)

		hbox_dst = gtk.HBox()
		lbl_dst = gtk.Label("Destination folder*: ")
		self.txt_dst = gtk.Entry()
		self.set_destination(dest)
		self.txt_dst.connect("changed", self.entrychanged)
		hbox_dst.pack_start(lbl_dst,False, False, 5)
		hbox_dst.pack_start(self.txt_dst,True, True, 5)
		vbox.pack_start(hbox_dst,False, False, 5)

		hbox_cmd = gtk.HBox()
		lbl_cmd = gtk.Label("Command: ")
		self.txt_cmd = gtk.Entry()
		self.set_command(command)
		hbox_cmd.pack_start(lbl_cmd,False, False, 5)
		hbox_cmd.pack_start(self.txt_cmd,True, True, 5)
		vbox.pack_start(hbox_cmd,False, False, 5)

		btn = self.get_widget_for_response(gtk.RESPONSE_OK)
		btn.set_sensitive(self.entryfilled())


		box.add(vbox)
		self.show_all()


	def entryfilled(self):
		return (self.txt_url.get_text_length()>0) and (self.txt_dst.get_text_length()>0)


	def entrychanged(self, entry):
		btn = self.get_widget_for_response(gtk.RESPONSE_OK)
		btn.set_sensitive (self.entryfilled())

	def get_tracker(self):
		return self.txt_url.get_text()

	def set_tracker(self, tracker):
		self.txt_url.set_text(tracker)


	def get_destination(self):
		return self.txt_dst.get_text()

	def set_destination(self, dst):
		self.txt_dst.set_text(dst)

	def get_command(self):
		return self.txt_cmd.get_text()

	def set_command(self, cmd):
		self.txt_cmd.set_text(cmd)


class GtkUI(GtkPluginBase):
	def enable(self):
		log.info("applying prefs for automove")

		component.get("PluginManager").register_hook("on_apply_prefs", self.on_apply_prefs)
		component.get("PluginManager").register_hook("on_show_prefs", self.on_show_prefs)
		self.load_ui()
		self.dirty = False




	def disable(self):
		log.info("applying prefs for automove")
		component.get("Preferences").remove_page("automove")



	def load_ui(self):
		mainWindow = gtk.Frame()
		self.window = mainWindow
		btnAdd = gtk.Button(stock=gtk.STOCK_ADD)
		btnAdd.connect("clicked", self.on_add_tracker)
		self.btnEdit = gtk.Button(stock=gtk.STOCK_EDIT)
		self.btnEdit.connect("clicked", self.on_edit_tracker)
		self.btnDelete = gtk.Button(stock=gtk.STOCK_DELETE)
		self.btnDelete.connect("clicked", self.on_delete_tracker)

		vBox = gtk.VBox(homogeneous=False, spacing=6)
		hBox = gtk.HBox(homogeneous=False, spacing=6)

		vBox.pack_start(hBox, False, False, 0)
		hBox.pack_end(self.btnDelete, False, False, 5)
		hBox.pack_end(self.btnEdit, False, False, 5)
		hBox.pack_end(btnAdd, False, False, 5)

		self.liststore= gtk.ListStore (str,str,str);
		self.treeview = gtk.TreeView(self.liststore)
		#self.treeview.connect("cursor-changed", self.treeviewselected)
		col_url = gtk.TreeViewColumn('Tracker')
		col_dst = gtk.TreeViewColumn('Destination')
		col_cmd = gtk.TreeViewColumn('Command')

		# add columns to treeview
		self.treeview.append_column(col_url)
		self.treeview.append_column(col_dst)
		self.treeview.append_column(col_cmd)
		cell_url = gtk.CellRendererText()
		cell_url.editable = True
		col_url.pack_start(cell_url, True)
		col_url.add_attribute(cell_url, "text", 0)
		cell_dst = gtk.CellRendererText()
		col_dst.pack_start(cell_dst, True)
		col_dst.add_attribute(cell_dst, "text", 1)
		cell_cmd = gtk.CellRendererText()
		col_cmd.pack_start(cell_cmd, True)
		col_cmd.add_attribute(cell_cmd, "text", 2)

		vBox.pack_end(self.treeview)
		mainWindow.add(vBox)
		mainWindow.show_all()
		component.get("Preferences").add_page("automove", self.window)

	def on_add_tracker(self, widget):
		dialog = TrackerDialog(None)
		response = dialog.run()
		if response == gtk.RESPONSE_OK:
			self.liststore.append(row=[dialog.get_tracker(),
				dialog.get_destination(), dialog.get_command()])
			self.dirty = True
		dialog.destroy()

	def on_edit_tracker(self, widget):
		model, it = self.treeview.get_selection().get_selected()
		if it:
			u= model.get_value(it, 0)
			d= model.get_value(it, 1)
			c= model.get_value(it, 2)
			dialog = TrackerDialog(None, u, d, c)
			response = dialog.run()
			if response == gtk.RESPONSE_OK:
				self.liststore.set_value(it, 0, dialog.get_tracker())
				self.dirty = True
			dialog.destroy()


	def on_delete_tracker(self, widget):
		model, it = self.treeview.get_selection().get_selected()
		if it:
			model.remove(it)

	def populate_list(self):
		if self.dirty :
			log.info("List in dirty state, don't reload prefs")
			return
		self.liststore.clear()
		for t in self.config["trackers"]:
			self.liststore.append(row=[ t["url"], t["dst"], t["cmd"] ])

	def on_apply_prefs(self):
		log.info("applying prefs for automove")
		#dump the list
		tl = []
		for row in self.liststore:
			tl.append({"url": row[0], "dst": row[1], "cmd": row[2] })

		self.config["trackers"] = tl
		client.automove.set_config(self.config)
		self.dirty  = False

	def on_show_prefs(self):
		client.automove.get_config().addCallback(self.cb_get_config)
		self.populate_list()

	def cb_get_config(self, config):
		"callback for on show_prefs"
		self.config = config
