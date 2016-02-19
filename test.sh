#!/bin/bash
node_docker="docker run -it --rm -v $PWD:/mnt node:5 /bin/bash -c "

cmd="cd /mnt; "

node_exec="node index.js "


#cmd+=$node_exec"project/10/ArrayTest/Main.jack""; "

#cmd+=$node_exec"project/11/Average/Main.jack""; "
cmd+=$node_exec"project/11/ComplexArrays/Main.jack""; "
#cmd+=$node_exec"project/11/ConvertToBin/Main.jack""; "
#cmd+=$node_exec"project/11/Pong/Main.jack""; "
#cmd+=$node_exec"project/11/Pong/Ball.jack""; "
#cmd+=$node_exec"project/11/Pong/Bat.jack""; "
#cmd+=$node_exec"project/11/Pong/PongGame.jack""; "

#cmd+=$node_exec"project/11/Seven/Main.jack""; "

#cmd+=$node_exec"project/11/Square/Main.jack""; "
#cmd+=$node_exec"project/11/Square/Square.jack""; "
#cmd+=$node_exec"project/11/Square/SquareGame.jack""; "

echo $cmd
$node_docker " $cmd "
