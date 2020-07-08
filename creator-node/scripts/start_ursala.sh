sleep 5
nucypher ursula run --dev --federated-only --rest-port 11500 &

sleep 5
nucypher ursula run --dev --federated-only --rest-port 11501 --teacher localhost:11500 &
