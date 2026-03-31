"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
const expo_router_1 = require("expo-router");
function RootLayout() {
    return (<expo_router_1.Stack screenOptions={{
            headerStyle: { backgroundColor: '#0A0E1A' },
            headerTintColor: '#00D4FF',
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: '#0A0E1A' },
        }}/>);
}
//# sourceMappingURL=_layout.js.map