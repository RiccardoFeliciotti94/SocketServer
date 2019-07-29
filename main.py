from Naked.toolshed.shell import execute_js
from threading import Thread

def index():
    execute_js('index.js')
def index2():
    execute_js('index2.js')
def index3():
    execute_js('index3.js')
def index4():
    execute_js('index4.js')
def index5():
    execute_js('index5.js')


thread = Thread(target = index)
thread2 = Thread(target = index2)
thread3 = Thread(target = index3)
thread4 = Thread(target = index4)
thread5 = Thread(target = index5)
thread.start()
thread2.start()
thread3.start()
thread4.start()
thread5.start()
