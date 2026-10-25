# Device validation

Choose the smallest environment matrix that covers the changed risk. Identify platform/OS, device class, orientation/window behavior, build flavor, backend fixture and credential scope. Do not claim all supported devices from a single simulator.

| Layer | Evidence | Limit |
|---|---|---|
| Pure logic | State transitions and bounds with controlled inputs | No platform lifecycle/hardware |
| Platform adapter | Actual installed framework integration with permitted fixtures | May omit OS scheduling/device behavior |
| Simulator/emulator UI | Observed navigation, input and relevant restored state | Not physical performance or every sensor |
| Physical target | Actual permission, interruption and representative performance behavior | Covers only recorded device/configuration |
| Packaged/installed build | Startup, essential flow and persistence after install/update | Not store review or general deployment acceptance |

For asynchronous behavior, wait for the specific state and use bounded deadlines. A permanently connected real-time app may never reach network idle. Observe before selecting controls and capture enough context to identify the current object.

For process restoration, distinguish rotation/configuration change, activity recreation, process kill and explicit app data clearing. Data clearing is destructive and should not be used on owner data. For connectivity, use an authorized actual network control or explicit adapter fixture; changing a visual status indicator is not a network outage.

Record commands and observed effects, including not-run cases. Keep logs/screenshots free of secrets. Restore temporary test settings that are yours and preserve unrelated device configuration. Do not install software, enroll a device farm or activate a service just to fill the matrix.
