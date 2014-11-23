#!/bin/sh
cd /media/diskstorage1/project/automove
mkdir temp
export PYTHONPATH=./temp
/usr/bin/python setup.py  bdist_egg
rm -f /var/lib/deluge/.config/deluge/plugins/automove-0.1-py2.7.egg 
cp -f ./dist/automove-0.1-py2.7.egg  /var/lib/deluge/.config/deluge/plugins/
chown deluge:deluge /var/lib/deluge/.config/deluge/plugins/automove-0.1-py2.7.egg
rm -fr ./temp
