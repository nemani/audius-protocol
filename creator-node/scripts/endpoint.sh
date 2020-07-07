
/usr/bin/wait && nucypher ursula run --dev --federated-only --rest-port 11500 &
/usr/bin/wait && nucypher ursula run --dev --federated-only --rest-port 11501 --teacher localhost:11500 &
/usr/bin/wait && exec node src/index.js