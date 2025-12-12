# Custom NSIS installer script for InZone
# This file customizes the installer/uninstaller messages

# Custom uninstaller messages - Option 4: Human-friendly
!define MUI_UNTEXT_WELCOME_INFO_TITLE "Saying Goodbye"
!define MUI_UNTEXT_WELCOME_INFO_TEXT "We're sad to see you go, but we get it!$\r$\n$\r$\nBefore uninstalling, please make sure InZone is closed.$\r$\n$\r$\nThank you for trusting us with your screen time tracking. We wish you all the best!$\r$\n$\r$\nClick Uninstall when you're ready."

# Uninstall confirm page
!define MUI_UNTEXT_CONFIRM_TITLE "Ready to Say Goodbye?"
!define MUI_UNTEXT_CONFIRM_SUBTITLE "InZone will be removed from your computer."

# Uninstalling page
!define MUI_UNTEXT_UNINSTALLING_TITLE "Removing InZone..."
!define MUI_UNTEXT_UNINSTALLING_SUBTITLE "Please wait while we remove InZone from your computer."

# Uninstall finish page
!define MUI_UNTEXT_FINISH_TITLE "Thanks for Being Part of Our Journey!"
!define MUI_UNTEXT_FINISH_SUBTITLE "InZone has been successfully removed."
!define MUI_UNTEXT_FINISH_INFO_TEXT "InZone has been uninstalled from your computer.$\r$\n$\r$\nWe hope it helped you stay productive."

# Optional: Customize installer messages too (more welcoming)
!define MUI_TEXT_WELCOME_INFO_TITLE "Welcome to InZone! 🎯"
!define MUI_TEXT_WELCOME_INFO_TEXT "This will install InZone on your computer - a lightweight widget to help you track your screen time and stay productive.$\r$\n$\r$\nNote: InZone requires Administrator privileges to track system events.$\r$\n$\r$\nClick Next to continue."

!define MUI_TEXT_DIRECTORY_TITLE "Choose Your Install Location"
!define MUI_TEXT_DIRECTORY_SUBTITLE "Where would you like to install InZone?"

!define MUI_TEXT_INSTALLING_TITLE "Installing InZone..."
!define MUI_TEXT_INSTALLING_SUBTITLE "Almost there! Setting up InZone on your computer."

!define MUI_TEXT_FINISH_TITLE "You're All Set! 🎉"
!define MUI_TEXT_FINISH_SUBTITLE "InZone is ready to help you track your time."
!define MUI_TEXT_FINISH_INFO_TEXT "InZone has been installed successfully!$\r$\n$\r$\nYou'll find it in your system tray. Click the tray icon to show or hide the widget.$\r$\n$\r$\nNeed help? Click the '?' button in the widget for setup instructions."

# Finish page options
!define MUI_TEXT_FINISH_RUN "Launch InZone now"
!define MUI_FINISHPAGE_RUN_TEXT "Start InZone and begin tracking your screen time"
