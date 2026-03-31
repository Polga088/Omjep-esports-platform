"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeScreen;
const react_native_1 = require("react-native");
const expo_status_bar_1 = require("expo-status-bar");
function HomeScreen() {
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>OMJEP</react_native_1.Text>
      <react_native_1.Text style={styles.subtitle}>Plateforme e-sport EA FC</react_native_1.Text>
      <expo_status_bar_1.StatusBar style="light"/>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#00D4FF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#94a3b8',
    },
});
//# sourceMappingURL=index.js.map