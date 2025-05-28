import Pusher from "pusher-js/react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function TabTwoScreen() {
  const [message, setMessage] = useState("Waiting for message...");

  useEffect(() => {
    const pusher = new Pusher("gbgyktv10pddwyo2wtre", {
      cluster: "mt1", // required by types, ignored by Reverb
      wsHost: "192.168.10.113", // your machine IP
      wsPort: 8080,
      wssPort: 8080,
      forceTLS: false,
      enabledTransports: ["ws"],
      disableStats: true,
    });

    pusher.connection.bind("connected", () => {
      console.log("✅ Connected to Reverb WebSocket");
    });

    const channel = pusher.subscribe("test");

    channel.bind("test-event", function (data: any) {
      console.log("📦 EVENT RECEIVED:", data);
      setMessage(data.message);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Laravel Reverb Message</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    color: "green",
    textAlign: "center",
  },
});
