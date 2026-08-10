export type Dictionary = {
  languageToggle: {
    english: string;
    kannada: string;
  };
  phoneOtp: {
    checkingSession: string;
    title: string;
    phoneLabel: string;
    phonePlaceholder: string;
    continueButton: string;
    invalidPhone: string;
    otpTitle: string;
    otpSentTo: string;
    otpLabel: string;
    verifyButton: string;
    invalidOtp: string;
    resendButton: string;
    resendCooldown: string;
    changeNumber: string;
    successTitle: string;
    successMessage: string;
    sendError: string;
    verifyError: string;
    sending: string;
    verifying: string;
  };
  forgotPassword: {
    invalidEmail: string;
    requestError: string;
    sentTitle: string;
    sentMessage: string;
    requestTitle: string;
    requestIntro: string;
    emailLabel: string;
    sending: string;
    sendLinkButton: string;
    checkingMessage: string;
    invalidTitle: string;
    invalidMessage: string;
    requestNewLinkButton: string;
    ineligibleTitle: string;
    ineligibleMessage: string;
    successTitle: string;
    successMessage: string;
    continueToLoginButton: string;
    newPasswordTitle: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    invalidNewPassword: string;
    passwordMismatch: string;
    resetError: string;
    resetting: string;
    resetButton: string;
  };
  bankAuth: {
    loginTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    invalidEmail: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    invalidPassword: string;
    loginButton: string;
    loggingIn: string;
    loginError: string;
    resetTitle: string;
    resetIntro: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    invalidNewPassword: string;
    passwordMismatch: string;
    resetButton: string;
    resetting: string;
    resetError: string;
    successTitle: string;
    successMessage: string;
    continueButton: string;
    forgotPasswordLink: string;
  };
  bankPortal: {
    navStock: string;
    navShortage: string;
    navProspects: string;
    navSettings: string;
    signOut: string;
    bankLabel: string;
    suspendedTitle: string;
    suspendedMessage: string;
    blockedTitle: string;
    blockedMessage: string;
    stock: {
      title: string;
      staleBanner: string;
      groupHeader: string;
      componentWholeBlood: string;
      unitsHeader: string;
      updatedHeader: string;
      updatedJustNow: string;
      updatedHoursAgo: string;
      staleLabel: string;
      incrementAriaLabel: string;
      decrementAriaLabel: string;
      saveError: string;
    };
    shortage: {
      title: string;
      groupLabel: string;
      unitsNeededLabel: string;
      invalidUnits: string;
      postButton: string;
      activeListTitle: string;
      noActiveShortages: string;
      unitsNeededSummary: string;
      resolveButton: string;
      postError: string;
      resolveError: string;
    };
    settings: {
      title: string;
      addressLabel: string;
      phoneLabel: string;
      policyNotesLabel: string;
      openingHoursTitle: string;
      closedLabel: string;
      openLabel: string;
      openFromLabel: string;
      openToLabel: string;
      saveButton: string;
      savedMessage: string;
      saveError: string;
      days: {
        sun: string;
        mon: string;
        tue: string;
        wed: string;
        thu: string;
        fri: string;
        sat: string;
      };
    };
    prospects: {
      title: string;
      emptyMessage: string;
      donorLabel: string;
      phoneLabel: string;
      bloodGroupLabel: string;
      requestRefLabel: string;
      statusAccepted: string;
      statusScreening: string;
      statusDonated: string;
      statusRejected: string;
      statusNoShow: string;
      arrivedButton: string;
      donatedButton: string;
      rejectedButton: string;
      noShowButton: string;
      arrivedError: string;
      rejectedError: string;
      noShowError: string;
    };
    confirm: {
      title: string;
      donorLabel: string;
      claimedGroupLabel: string;
      confirmedGroupLabel: string;
      confirmButton: string;
      confirmedTitle: string;
      confirmedMessage: string;
      backToProspectsLink: string;
      confirmError: string;
    };
  };
  landing: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    findBloodTitle: string;
    findBloodDescription: string;
    raiseRequestTitle: string;
    raiseRequestDescription: string;
    donorTitle: string;
    donorDescription: string;
    bankTitle: string;
    bankDescription: string;
    adminTitle: string;
    adminDescription: string;
    searchSectionTitle: string;
    searchSectionSubtitle: string;
  };
  qrLanding: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    searchBankTitle: string;
    searchBankDescription: string;
    searchDonorTitle: string;
    searchDonorDescription: string;
    donateTitle: string;
    donateDescription: string;
  };
  search: {
    s1: {
      title: string;
      locationLabel: string;
      locationPlaceholder: string;
      noMatch: string;
      resolving: string;
      bloodGroupLabel: string;
      componentLabel: string;
      componentWholeBlood: string;
      regionConfirm: string;
      searchButton: string;
    };
    s2: {
      resultsTitle: string;
      changeSearch: string;
      groupHeader: string;
      unitsHeader: string;
      updatedHeader: string;
      updatedJustNow: string;
      updatedHoursAgo: string;
      staleLabel: string;
      openBadge: string;
      closedBadge: string;
      callButton: string;
      adjacentLabel: string;
      raiseRequestCta: string;
      noBanks: string;
      noSearchYet: string;
      backToSearch: string;
      noStockAvailable: string;
      viewBreakdownLabel: string;
      hideBreakdownLabel: string;
    };
    s4: {
      signedInAs: string;
      signOut: string;
      blockedTitle: string;
      blockedMessage: string;
      noBanksMessage: string;
      continueButton: string;
      formTitle: string;
      bloodGroupLabel: string;
      selectBloodGroupPlaceholder: string;
      invalidBloodGroup: string;
      componentLabel: string;
      componentWholeBlood: string;
      unitsLabel: string;
      invalidUnits: string;
      destinationBankLabel: string;
      selectBankPlaceholder: string;
      invalidBank: string;
      urgencyLabel: string;
      selectUrgencyPlaceholder: string;
      urgencyNormal: string;
      urgencyEmergency: string;
      invalidUrgency: string;
      patientNameLabel: string;
      patientNamePlaceholder: string;
      submitButton: string;
      submitting: string;
      submitError: string;
      submittedTitle: string;
      submittedMessage: string;
      viewStatusLink: string;
    };
    s5: {
      title: string;
      stageLabel: string;
      stageFindingProspects: string;
      stageEvaluatingProspects: string;
      stageScheduled: string;
      stageResolved: string;
      stageClosed: string;
      notifiedCountLabel: string;
      acceptedCountLabel: string;
      adminLabel: string;
      noAdminYetMessage: string;
      contactAdminButton: string;
      cancelButton: string;
      cancelReasonLabel: string;
      selectReasonPlaceholder: string;
      reasonFoundElsewhere: string;
      reasonNoLongerNeeded: string;
      reasonNoDonorFound: string;
      reasonExpired: string;
      reasonAbusive: string;
      invalidReason: string;
      cancelConfirmButton: string;
      cancelBackButton: string;
      cancelledTitle: string;
      cancelledMessage: string;
      cancelError: string;
      notFoundTitle: string;
      notFoundMessage: string;
      idlePromptMessage: string;
      stillNeededButton: string;
      stillNeededError: string;
    };
  };
  donorRegister: {
    verifiedTitle: string;
    pushEnabled: string;
    pushSkipped: string;
    formTitle: string;
    fullNameLabel: string;
    invalidFullName: string;
    dobLabel: string;
    invalidDob: string;
    bloodGroupLabel: string;
    selectBloodGroupPlaceholder: string;
    invalidBloodGroup: string;
    pinLabel: string;
    pinPlaceholder: string;
    invalidPin: string;
    pinNotFound: string;
    consentText: string;
    consentRequired: string;
    submitButton: string;
    submitting: string;
    submitError: string;
    registeredTitle: string;
    registeredMessage: string;
    goToDashboard: string;
  };
  donorPortal: {
    navHome: string;
    navPledge: string;
    navHistory: string;
    navSettings: string;
    signOut: string;
    blockedTitle: string;
    blockedMessage: string;
    home: {
      title: string;
      eligibleTitle: string;
      eligibleMessage: string;
      cooldownTitle: string;
      cooldownMessage: string;
      availabilityToggleLabel: string;
      pauseControlLabel: string;
      pauseDaysLabel: string;
      pauseDaysOption: string;
      pauseButton: string;
      pausedMessage: string;
      resumeButton: string;
      activePledgeTitle: string;
      viewPledgeLink: string;
      actionError: string;
      invitationsTitle: string;
      invitationsHint: string;
      invitationsEmptyMessage: string;
      invitedOnHeader: string;
      viewDetailsLink: string;
      willingToDonateButton: string;
    };
    pledge: {
      title: string;
      noActivePledgeTitle: string;
      noActivePledgeMessage: string;
      destinationBankLabel: string;
      addressLabel: string;
      phoneLabel: string;
      scheduleNote: string;
      adminLabel: string;
      noAdminYetMessage: string;
      cancelButton: string;
      cancelConfirmTitle: string;
      cancelConfirmMessage: string;
      cancelConfirmButton: string;
      cancelBackButton: string;
      cancelledTitle: string;
      cancelledMessage: string;
      cancelError: string;
    };
    history: {
      title: string;
      pastDonationsTitle: string;
      noDonationsMessage: string;
      donatedOnLabel: string;
      nextEligibleTitle: string;
      nextEligibleMessage: string;
      eligibleNowMessage: string;
    };
    settings: {
      title: string;
      editSectionTitle: string;
      fullNameLabel: string;
      bloodGroupLabel: string;
      pinLabel: string;
      saveButton: string;
      savedMessage: string;
      invalidFullName: string;
      invalidPin: string;
      pinNotFound: string;
      availabilityPincodesTitle: string;
      availabilityPincodesIntro: string;
      availabilityPincodeCountLabel: string;
      addAvailabilityPincodePlaceholder: string;
      addAvailabilityPincodeButton: string;
      removeAvailabilityPincodeButton: string;
      availabilityPincodeAdded: string;
      noAvailabilityPincodes: string;
      atCapMessage: string;
      duplicatePincodeMessage: string;
      sameAsHomeMessage: string;
      deleteSectionTitle: string;
      deleteIntro: string;
      deleteButton: string;
      deleteConfirmTitle: string;
      deleteConfirmMessage: string;
      deleteConfirmMessageWithPledge: string;
      deleteConfirmButton: string;
      deleteBackButton: string;
      deletedTitle: string;
      deletedMessage: string;
    };
    request: {
      title: string;
      bloodGroupLabel: string;
      destinationBankLabel: string;
      urgencyLabel: string;
      regionLabel: string;
      urgencyNormal: string;
      urgencyEmergency: string;
      canDonateButton: string;
      notNowButton: string;
      notForAWhileButton: string;
      pauseDaysLabel: string;
      pauseDaysOption: string;
      confirmPauseButton: string;
      acceptedTitle: string;
      acceptedMessage: string;
      notNowTitle: string;
      notNowMessage: string;
      pausedTitle: string;
      pausedMessage: string;
      alreadyHandledTitle: string;
      alreadyHandledMessage: string;
      alreadyPledgedTitle: string;
      alreadyPledgedMessage: string;
      submitError: string;
    };
  };
  adminAuth: {
    loginTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    invalidEmail: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    invalidPassword: string;
    loginButton: string;
    loggingIn: string;
    loginError: string;
    resetTitle: string;
    resetIntro: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    invalidNewPassword: string;
    passwordMismatch: string;
    resetButton: string;
    resetting: string;
    resetError: string;
    successTitle: string;
    successMessage: string;
    continueButton: string;
    forgotPasswordLink: string;
  };
  adminPortal: {
    signOut: string;
    blockedTitle: string;
    blockedMessage: string;
    roleAdmin: string;
    roleCoordinator: string;
    headerWithRegion: string;
    headerNoRegion: string;
    navQueue: string;
    navDonors: string;
    navBanks: string;
    navReports: string;
    navAudit: string;
    navMetrics: string;
    pushToggle: {
      enableButton: string;
      errorLabel: string;
    };
    queue: {
      title: string;
      filterLabel: string;
      filterAllOption: string;
      columnAge: string;
      columnUrgency: string;
      columnStage: string;
      columnBloodGroup: string;
      columnProspects: string;
      columnOwner: string;
      columnHandle: string;
      urgencyNormal: string;
      urgencyEmergency: string;
      ageMinutes: string;
      ageHours: string;
      ownerUnassigned: string;
      escalationFlag: string;
      unownedAlertFlag: string;
      emptyMessage: string;
      noRegionMessage: string;
      handleButton: string;
      handleTakenLabel: string;
      confirmHandleMessage: string;
      confirmHandleButton: string;
      cancelHandleButton: string;
      handleError: string;
    };
    myCases: {
      title: string;
      emptyMessage: string;
      prospectsLoadError: string;
      loadingProspectsMessage: string;
      assignError: string;
    };
    requestDetail: {
      title: string;
      notFoundMessage: string;
      actionError: string;
      notYourCaseMessage: string;
      requesterPhoneLabel: string;
      patientNameLabel: string;
      patientNameUnknown: string;
      bloodGroupLabel: string;
      ageLabel: string;
      unitsLabel: string;
      urgencyLabel: string;
      urgencyNormal: string;
      urgencyEmergency: string;
      destinationBankLabel: string;
      ownerLabel: string;
      ownerUnassignedMessage: string;
      ownerYou: string;
      takeOwnershipButton: string;
      takeOwnershipDoneMessage: string;
      assignButton: string;
      assignDoneMessage: string;
      unassignButton: string;
      unassignDoneMessage: string;
      assignedLabel: string;
      notAssignedLabel: string;
      transferLabel: string;
      selectRegionPlaceholder: string;
      transferButton: string;
      transferDoneMessage: string;
      closeButton: string;
      closeReasonLabel: string;
      closeConfirmButton: string;
      closeBackButton: string;
      invalidReason: string;
      closeDoneMessage: string;
      reportButton: string;
      reportReasonLabel: string;
      selectReportReasonPlaceholder: string;
      reportReasonPaymentDemanded: string;
      reportReasonAbusiveBehavior: string;
      reportReasonSuspectedFraud: string;
      reportReasonOther: string;
      reportDetailsLabel: string;
      reportDetailsPlaceholder: string;
      reportConfirmButton: string;
      reportCancelButton: string;
      invalidReportReason: string;
      reportDoneMessage: string;
      prospectsTitle: string;
      prospectsEmptyMessage: string;
      prospectStatusInvited: string;
      prospectStatusAccepted: string;
      prospectStatusScreening: string;
      prospectStatusDonated: string;
      prospectStatusRejected: string;
      prospectStatusNoShow: string;
      prospectStatusStoodDown: string;
      invitedAtLabel: string;
      respondedAtLabel: string;
      outcomeAtLabel: string;
      callDonorButton: string;
      standDownButton: string;
      standDownDoneMessage: string;
      timelineTitle: string;
    };
    donorLookup: {
      title: string;
      noRegionMessage: string;
      bloodGroupFilterLabel: string;
      allBloodGroupsOption: string;
      pincodeFilterLabel: string;
      allPincodesOption: string;
      availableOnlyLabel: string;
      emptyMessage: string;
      columnName: string;
      columnBloodGroup: string;
      columnPincode: string;
      columnStatus: string;
      columnAction: string;
      statusAvailable: string;
      statusPaused: string;
      statusCooldown: string;
      statusUnavailable: string;
      revealButton: string;
      phoneLabel: string;
      selectRequestLabel: string;
      selectRequestPlaceholder: string;
      noOpenRequestsMessage: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      revealConfirmButton: string;
      revealCancelButton: string;
      errorNoOpenRequest: string;
      errorInvalidReason: string;
      errorRateLimited: string;
      errorGeneric: string;
      prevPageButton: string;
      nextPageButton: string;
    };
    bankManagement: {
      title: string;
      noRegionMessage: string;
      addressLabel: string;
      phoneLabel: string;
      verifiedLabel: string;
      unverifiedLabel: string;
      verifyButton: string;
      revokeVerificationButton: string;
      activeLabel: string;
      suspendedLabel: string;
      suspendButton: string;
      reactivateButton: string;
      policyNotesLabel: string;
      saveButton: string;
      savedMessage: string;
      emptyMessage: string;
      actionError: string;
      nameLabel: string;
      licenceNoLabel: string;
      pincodeLabel: string;
      staffEmailLabel: string;
      staffFullNameLabel: string;
      addBankTitle: string;
      addBankButton: string;
      addingBank: string;
      tempPasswordIntro: string;
      copyButton: string;
      copiedLabel: string;
      dismissButton: string;
      relayPasswordNote: string;
      editButton: string;
      cancelButton: string;
      saveDetailsButton: string;
      detailsSavedMessage: string;
      requiredFieldError: string;
      invalidEmailError: string;
      pincodeNotFoundError: string;
    };
    moderation: {
      title: string;
      emptyMessage: string;
      filterLabel: string;
      filterAllOption: string;
      filterOpenOption: string;
      statusOpen: string;
      statusBlocked: string;
      reporterLabel: string;
      subjectLabel: string;
      roleDonor: string;
      roleSearcher: string;
      roleBankStaff: string;
      roleAdmin: string;
      roleCoordinator: string;
      reasonLabel: string;
      detailsLabel: string;
      reportedAtLabel: string;
      blockButton: string;
      blockedLabel: string;
      blockDoneMessage: string;
      actionError: string;
    };
    auditLog: {
      title: string;
      coordinatorOnlyBanner: string;
      emptyMessage: string;
      filterLabel: string;
      filterAllOption: string;
      columnTimestamp: string;
      columnActor: string;
      columnAction: string;
      columnEntity: string;
      actionViewContact: string;
      actionTransferRegion: string;
      actionCloseRequest: string;
      actionBlockUser: string;
      actionAssignToBank: string;
      actionUnassignFromBank: string;
      actionTakeOwnership: string;
      actionFileReport: string;
      entityDonor: string;
      entityRequest: string;
      entityProfile: string;
      entityProspect: string;
      prevPageButton: string;
      nextPageButton: string;
    };
    metrics: {
      title: string;
      fullHistoryNote: string;
      prospectsPerDonationLabel: string;
      resolvedRateLabel: string;
      firstAcceptanceLabel: string;
      acceptanceToDonationLabel: string;
      foundElsewhereLabel: string;
      tier1Label: string;
      tier1SampleSince: string;
      tier1SampleSize: string;
      notEnoughData: string;
      durationMinutes: string;
      donorResponseTitle: string;
      donorResponseColumnMonth: string;
      donorResponseColumnTotal: string;
      donorResponseColumnDeclined: string;
      donorResponseColumnIgnored: string;
      adminResponseTitle: string;
      adminResponseMedianLabel: string;
      adminResponseSampleLabel: string;
      bucketUpTo1h: string;
      bucket1To4h: string;
      bucket4To12h: string;
      bucket12To24h: string;
      bucketOver24h: string;
    };
  };
  footer: {
    privacyLink: string;
    termsLink: string;
  };
  siteHeader: {
    brandName: string;
  };
  privacyPage: {
    title: string;
    intro: string;
    whatWeCollectTitle: string;
    whatWeCollectBody: string;
    whoSeesItTitle: string;
    whoSeesItBody: string;
    yourRightsTitle: string;
    yourRightsBody: string;
    grievanceTitle: string;
    grievanceBody: string;
  };
  termsPage: {
    title: string;
    intro: string;
    prohibitedTitle: string;
    prohibitedBody: string;
    noPaymentsBody: string;
    reportBody: string;
  };
};

const en: Dictionary = {
  languageToggle: {
    english: "English",
    kannada: "ಕನ್ನಡ",
  },
  phoneOtp: {
    checkingSession: "Checking your session...",
    title: "Enter your phone number",
    phoneLabel: "Phone number",
    phonePlaceholder: "10-digit mobile number",
    continueButton: "Send code",
    invalidPhone: "Enter a valid 10-digit phone number",
    otpTitle: "Enter the code",
    otpSentTo: "We sent a 6-digit code to {phone}",
    otpLabel: "6-digit code",
    verifyButton: "Verify",
    invalidOtp: "Enter the 6-digit code",
    resendButton: "Resend code",
    resendCooldown: "Resend code in {seconds}s",
    changeNumber: "Change number",
    successTitle: "Verified",
    successMessage: "Phone number {phone} verified.",
    sendError: "Could not send the code. Try again.",
    verifyError: "That code didn't work. Check it and try again.",
    sending: "Sending...",
    verifying: "Verifying...",
  },
  forgotPassword: {
    invalidEmail: "Enter a valid email address.",
    requestError: "Could not send the reset link. Try again.",
    sentTitle: "Check your inbox",
    sentMessage: "If that email belongs to an account, we've sent a link to reset the password. It's valid for a limited time.",
    requestTitle: "Forgot your password?",
    requestIntro: "Enter your email and we'll send you a link to set a new password.",
    emailLabel: "Email",
    sending: "Sending...",
    sendLinkButton: "Send reset link",
    checkingMessage: "Checking your link...",
    invalidTitle: "This link isn't valid",
    invalidMessage: "It may have expired or already been used. Request a new one below.",
    requestNewLinkButton: "Request a new link",
    ineligibleTitle: "This account can't be reset this way",
    ineligibleMessage: "Contact whoever manages your account for help.",
    successTitle: "Password changed",
    successMessage: "Your password has been updated.",
    continueToLoginButton: "Continue to login",
    newPasswordTitle: "Set a new password",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    invalidNewPassword: "Password must be at least 8 characters",
    passwordMismatch: "Passwords do not match",
    resetError: "Could not set the new password. Try again.",
    resetting: "Setting password...",
    resetButton: "Set new password",
  },
  bankAuth: {
    loginTitle: "Bank staff login",
    emailLabel: "Email",
    emailPlaceholder: "you@bank.example",
    invalidEmail: "Enter a valid email address",
    passwordLabel: "Password",
    passwordPlaceholder: "Password",
    invalidPassword: "Enter your password",
    loginButton: "Log in",
    loggingIn: "Logging in...",
    loginError: "Incorrect email or password.",
    resetTitle: "Set a new password",
    resetIntro: "This is your first login. Set a new password to continue.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    invalidNewPassword: "Password must be at least 8 characters",
    passwordMismatch: "Passwords do not match",
    resetButton: "Set password and continue",
    resetting: "Setting password...",
    resetError: "Could not set the new password. Try again.",
    successTitle: "Logged in",
    successMessage: "You're logged in to the bank portal.",
    continueButton: "Go to stock dashboard",
    forgotPasswordLink: "Forgot password?",
  },
  bankPortal: {
    navStock: "Stock dashboard",
    navShortage: "Post shortage",
    navProspects: "Incoming prospects",
    navSettings: "Settings",
    signOut: "Log out",
    bankLabel: "Logged in at {name}",
    suspendedTitle: "Account suspended",
    suspendedMessage: "This bank account has been suspended by a regional admin. Contact your regional admin for details.",
    blockedTitle: "Account blocked",
    blockedMessage: "This account has been blocked by an admin following a report. Contact your regional admin for details.",
    stock: {
      title: "Stock dashboard",
      staleBanner: "Some blood groups have outdated stock figures. Update them below.",
      groupHeader: "Blood group",
      componentWholeBlood: "Whole blood",
      unitsHeader: "Units",
      updatedHeader: "Last updated",
      updatedJustNow: "Just now",
      updatedHoursAgo: "{hours}h ago",
      staleLabel: "Outdated",
      incrementAriaLabel: "Increase units",
      decrementAriaLabel: "Decrease units",
      saveError: "Could not save. Try again.",
    },
    shortage: {
      title: "Post a shortage",
      groupLabel: "Blood group",
      unitsNeededLabel: "Units needed",
      invalidUnits: "Enter a number greater than 0",
      postButton: "Post shortage",
      activeListTitle: "Active shortages",
      noActiveShortages: "No active shortages right now.",
      unitsNeededSummary: "{units} units of {group} needed",
      resolveButton: "Resolve",
      postError: "Could not post the shortage. Try again.",
      resolveError: "Could not resolve. Try again.",
    },
    settings: {
      title: "Bank settings",
      addressLabel: "Address",
      phoneLabel: "Phone",
      policyNotesLabel: "Policy notes",
      openingHoursTitle: "Opening hours",
      closedLabel: "Closed",
      openLabel: "Open",
      openFromLabel: "From",
      openToLabel: "To",
      saveButton: "Save",
      savedMessage: "Saved.",
      saveError: "Could not save. Try again.",
      days: {
        sun: "Sunday",
        mon: "Monday",
        tue: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        fri: "Friday",
        sat: "Saturday",
      },
    },
    prospects: {
      title: "Incoming prospects",
      emptyMessage: "No prospects scheduled right now.",
      donorLabel: "Donor",
      phoneLabel: "Phone",
      bloodGroupLabel: "Blood group",
      requestRefLabel: "Request",
      statusAccepted: "Scheduled",
      statusScreening: "At the bank",
      statusDonated: "Donated",
      statusRejected: "Rejected",
      statusNoShow: "No show",
      arrivedButton: "Arrived",
      donatedButton: "Donated",
      rejectedButton: "Rejected",
      noShowButton: "No show",
      arrivedError: "Couldn't mark as arrived. Try again.",
      rejectedError: "Couldn't reject. Try again.",
      noShowError: "Couldn't mark as no-show. Try again.",
    },
    confirm: {
      title: "Confirm donation",
      donorLabel: "Donor",
      claimedGroupLabel: "Blood group on file",
      confirmedGroupLabel: "Confirmed blood group",
      confirmButton: "Confirm donation",
      confirmedTitle: "Donation confirmed",
      confirmedMessage: "{name}'s next eligible date has been updated.",
      backToProspectsLink: "Back to incoming prospects",
      confirmError: "Couldn't confirm the donation. Try again.",
    },
  },
  landing: {
    eyebrow: "Uttara Kannada · Lions Club initiative",
    heading: "Blood, when it matters most.",
    subtitle:
      "Find blood banks and donors near you, register to donate, or coordinate as a volunteer — all in one place.",
    findBloodTitle: "Find blood",
    findBloodDescription: "Search blood banks and available donors near your location.",
    raiseRequestTitle: "Raise a request",
    raiseRequestDescription: "Couldn't find blood, or need it urgently? Raise a request directly.",
    donorTitle: "Donor",
    donorDescription: "Register as a donor or check your pledge and donation history.",
    bankTitle: "Blood bank",
    bankDescription: "Sign in to manage stock levels and incoming requests.",
    adminTitle: "Admin",
    adminDescription: "Sign in to coordinate requests across the district.",
    searchSectionTitle: "Search directly",
    searchSectionSubtitle: "Enter a location and blood group to see who can help right now.",
  },
  qrLanding: {
    eyebrow: "Uttara Kannada · Lions Club initiative",
    heading: "What do you need?",
    subtitle: "Tap an option below to continue.",
    searchBankTitle: "Search blood bank",
    searchBankDescription: "See blood banks near you and their current stock.",
    searchDonorTitle: "Search donor",
    searchDonorDescription: "Need blood urgently? Raise a request and we'll find a donor.",
    donateTitle: "Donate blood",
    donateDescription: "Register as a donor and help save a life.",
  },
  search: {
    s1: {
      title: "Find blood",
      locationLabel: "PIN code or town name",
      locationPlaceholder: "e.g. 000001 or Sirsi",
      noMatch: "No matching PIN code or town found",
      resolving: "Checking...",
      bloodGroupLabel: "Blood group",
      componentLabel: "Component",
      componentWholeBlood: "Whole blood",
      regionConfirm: "Region: {region}",
      searchButton: "Search",
    },
    s2: {
      resultsTitle: "Results for {region}",
      changeSearch: "Change search",
      groupHeader: "Blood group",
      unitsHeader: "Units",
      updatedHeader: "Last updated",
      updatedJustNow: "Just now",
      updatedHoursAgo: "Updated {hours}h ago",
      staleLabel: "Outdated",
      openBadge: "Open now",
      closedBadge: "Closed",
      callButton: "Call {phone}",
      adjacentLabel: "Also check:",
      raiseRequestCta: "Can't find blood? Raise a request",
      noBanks: "No blood banks found in this region yet.",
      noSearchYet: "Start a search to see results.",
      backToSearch: "Back to search",
      noStockAvailable: "Not available",
      viewBreakdownLabel: "View stock breakdown",
      hideBreakdownLabel: "Hide stock breakdown",
    },
    s4: {
      signedInAs: "Signed in as {phone}",
      signOut: "Log out",
      blockedTitle: "You already have an open request",
      blockedMessage:
        "We can only have one open blood request per phone number at a time. Here's what's happening with it:",
      noBanksMessage:
        "There's no blood bank currently able to accept requests in your region. Contact the Lions Club directly for help.",
      continueButton: "Continue",
      formTitle: "Raise a request",
      bloodGroupLabel: "Blood group needed",
      selectBloodGroupPlaceholder: "Select blood group",
      invalidBloodGroup: "Select the blood group needed",
      componentLabel: "Component",
      componentWholeBlood: "Whole blood",
      unitsLabel: "Units needed",
      invalidUnits: "Enter a number of units between 1 and 10",
      destinationBankLabel: "Destination blood bank",
      selectBankPlaceholder: "Select a blood bank",
      invalidBank: "Select the destination blood bank",
      urgencyLabel: "Urgency",
      selectUrgencyPlaceholder: "Select urgency",
      urgencyNormal: "Normal",
      urgencyEmergency: "Emergency",
      invalidUrgency: "Select how urgent this is",
      patientNameLabel: "Patient's first name (optional)",
      patientNamePlaceholder: "First name only",
      submitButton: "Raise request",
      submitting: "Submitting...",
      submitError: "Could not submit your request. Try again.",
      submittedTitle: "Request raised",
      submittedMessage:
        "We're notifying eligible donors nearby. A volunteer admin will follow up if needed.",
      viewStatusLink: "View request status",
    },
    s5: {
      title: "Request status",
      stageLabel: "Status",
      stageFindingProspects: "Looking for donors",
      stageEvaluatingProspects: "Donors responding",
      stageScheduled: "Donation scheduled",
      stageResolved: "Resolved - thank you",
      stageClosed: "Closed",
      notifiedCountLabel: "Donors notified",
      acceptedCountLabel: "Donors accepted",
      adminLabel: "Admin",
      noAdminYetMessage: "Not assigned yet.",
      contactAdminButton: "Contact admin",
      cancelButton: "Cancel request",
      cancelReasonLabel: "Reason for cancelling",
      selectReasonPlaceholder: "Select a reason",
      reasonFoundElsewhere: "Found blood elsewhere",
      reasonNoLongerNeeded: "No longer needed",
      reasonNoDonorFound: "No donor found",
      reasonExpired: "Expired",
      reasonAbusive: "Abusive",
      invalidReason: "Select a reason before cancelling.",
      cancelConfirmButton: "Confirm cancellation",
      cancelBackButton: "Back",
      cancelledTitle: "Request cancelled",
      cancelledMessage: "This request has been closed.",
      cancelError: "Could not cancel this request. Try again.",
      notFoundTitle: "Request not found",
      notFoundMessage: "We couldn't find a request at this link.",
      idlePromptMessage: "We haven't seen any update on this request in a while. Is it still needed?",
      stillNeededButton: "Yes, still needed",
      stillNeededError: "Could not update this request. Try again.",
    },
  },
  donorRegister: {
    verifiedTitle: "Phone verified",
    pushEnabled: "Notifications enabled. We'll alert you when someone nearby needs your blood group.",
    pushSkipped: "Push notifications aren't enabled for this device. You can still register.",
    formTitle: "Complete your donor profile",
    fullNameLabel: "Full name",
    invalidFullName: "Enter your full name",
    dobLabel: "Date of birth",
    invalidDob: "You must be between 18 and 65 years old to register as a donor",
    bloodGroupLabel: "Blood group",
    selectBloodGroupPlaceholder: "Select blood group",
    invalidBloodGroup: "Select your blood group",
    pinLabel: "PIN code",
    pinPlaceholder: "6-digit PIN code",
    invalidPin: "Enter a valid 6-digit PIN code",
    pinNotFound: "We don't recognize that PIN code. Check it and try again.",
    consentText:
      "Your name, date of birth, blood group and PIN code are stored securely on our server. Your name and blood group become visible to regional volunteer admins and blood banks so they can find compatible donors. Your phone number is shared only after you accept a specific donation request — never before, and never in search results.",
    consentRequired: "You must agree before registering",
    submitButton: "Register",
    submitting: "Registering...",
    submitError: "Could not complete registration. Try again.",
    registeredTitle: "You're registered",
    registeredMessage:
      "Thanks for registering as a donor. We'll notify you when someone nearby needs your blood group.",
    goToDashboard: "Go to my dashboard",
  },
  donorPortal: {
    navHome: "Home",
    navPledge: "My pledge",
    navHistory: "History",
    navSettings: "Settings",
    signOut: "Log out",
    blockedTitle: "Account blocked",
    blockedMessage: "This account has been blocked by an admin following a report. Contact your regional admin for details.",
    home: {
      title: "Home",
      eligibleTitle: "You're available to donate",
      eligibleMessage: "We'll notify you if someone nearby needs your blood group.",
      cooldownTitle: "You're in cooldown",
      cooldownMessage: "You'll be eligible again on {date}.",
      availabilityToggleLabel: "Available to donate",
      pauseControlLabel: "Pause my availability",
      pauseDaysLabel: "Pause for",
      pauseDaysOption: "{days} days",
      pauseButton: "Pause",
      pausedMessage: "You're paused until {date}.",
      resumeButton: "Resume availability",
      activePledgeTitle: "Active pledge",
      viewPledgeLink: "View details",
      actionError: "Could not complete that action. Try again.",
      invitationsTitle: "Requests you may be able to help with",
      invitationsHint: "Select a request below, then tap \"Willing to donate\".",
      invitationsEmptyMessage: "No pending requests right now. We'll notify you when one matches.",
      invitedOnHeader: "Invited on",
      viewDetailsLink: "View details",
      willingToDonateButton: "Willing to donate",
    },
    pledge: {
      title: "My pledge",
      noActivePledgeTitle: "No active pledge",
      noActivePledgeMessage: "You don't have an active pledge right now.",
      destinationBankLabel: "Destination bank",
      addressLabel: "Address",
      phoneLabel: "Phone",
      scheduleNote: "The admin will call you to arrange a time.",
      adminLabel: "Admin contact",
      noAdminYetMessage: "Not assigned yet - a volunteer admin will reach out soon.",
      cancelButton: "Cancel pledge",
      cancelConfirmTitle: "Cancel this pledge?",
      cancelConfirmMessage:
        "The bank and admin will be notified you're no longer able to donate. This can't be undone.",
      cancelConfirmButton: "Yes, cancel",
      cancelBackButton: "No, keep it",
      cancelledTitle: "Pledge cancelled",
      cancelledMessage: "Thanks for letting us know. We'll find another donor.",
      cancelError: "Could not cancel your pledge. Try again.",
    },
    history: {
      title: "Donation history",
      pastDonationsTitle: "Past donations",
      noDonationsMessage: "You haven't donated yet.",
      donatedOnLabel: "Donated on {date} at {bank}",
      nextEligibleTitle: "Next eligible date",
      nextEligibleMessage: "You can donate again from {date}.",
      eligibleNowMessage: "You're eligible to donate now.",
    },
    settings: {
      title: "Settings",
      editSectionTitle: "Edit your details",
      fullNameLabel: "Full name",
      bloodGroupLabel: "Blood group",
      pinLabel: "PIN code",
      saveButton: "Save changes",
      savedMessage: "Saved.",
      invalidFullName: "Enter your name",
      invalidPin: "Enter a valid 6-digit PIN code",
      pinNotFound: "PIN code not recognised",
      availabilityPincodesTitle: "Also available to donate in",
      availabilityPincodesIntro: "List other PIN codes you're willing to travel to donate at, in addition to your home PIN code above.",
      availabilityPincodeCountLabel: "{count} of {max}",
      addAvailabilityPincodePlaceholder: "6-digit PIN code",
      addAvailabilityPincodeButton: "Add",
      removeAvailabilityPincodeButton: "Remove",
      availabilityPincodeAdded: "Added.",
      noAvailabilityPincodes: "You haven't added any extra PIN codes yet.",
      atCapMessage: "You've reached the maximum number of extra PIN codes.",
      duplicatePincodeMessage: "That PIN code is already on your list.",
      sameAsHomeMessage: "That's already your home PIN code.",
      deleteSectionTitle: "Delete account",
      deleteIntro: "This permanently removes your donor account. It cannot be undone.",
      deleteButton: "Delete my account",
      deleteConfirmTitle: "Are you sure?",
      deleteConfirmMessage: "This will remove your donor record from our system permanently.",
      deleteConfirmMessageWithPledge: "This will remove your donor record permanently. Your active pledge will be stood down and the responsible admin notified.",
      deleteConfirmButton: "Yes, delete my account",
      deleteBackButton: "Cancel",
      deletedTitle: "Account deleted",
      deletedMessage: "Your donor account has been deleted. We're sorry to see you go.",
    },
    request: {
      title: "Request detail",
      bloodGroupLabel: "Blood group needed",
      destinationBankLabel: "Destination bank",
      urgencyLabel: "Urgency",
      regionLabel: "Region",
      urgencyNormal: "Normal",
      urgencyEmergency: "Emergency",
      canDonateButton: "I can donate",
      notNowButton: "Not now",
      notForAWhileButton: "Not for a while",
      pauseDaysLabel: "Pause for",
      pauseDaysOption: "{days} days",
      confirmPauseButton: "Confirm",
      acceptedTitle: "You're confirmed",
      acceptedMessage:
        "Thanks for stepping up! {bank} has been notified. A volunteer admin will contact you soon about the time and place.",
      notNowTitle: "No problem",
      notNowMessage: "We'll offer this request to other donors nearby.",
      pausedTitle: "You're paused",
      pausedMessage: "We won't notify you again until {date}.",
      alreadyHandledTitle: "Already handled, thank you",
      alreadyHandledMessage: "This request has already been taken care of.",
      alreadyPledgedTitle: "You already have an active pledge",
      alreadyPledgedMessage:
        "You can only have one active pledge at a time. Check your current pledge before responding to a new request.",
      submitError: "Could not record your response. Try again.",
    },
  },
  adminAuth: {
    loginTitle: "Admin login",
    emailLabel: "Email",
    emailPlaceholder: "you@lionsclub.example",
    invalidEmail: "Enter a valid email address",
    passwordLabel: "Password",
    passwordPlaceholder: "Password",
    invalidPassword: "Enter your password",
    loginButton: "Log in",
    loggingIn: "Logging in...",
    loginError: "Incorrect email or password.",
    resetTitle: "Set a new password",
    resetIntro: "This is your first login. Set a new password to continue.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    invalidNewPassword: "Password must be at least 8 characters",
    passwordMismatch: "Passwords do not match",
    resetButton: "Set password and continue",
    resetting: "Setting password...",
    resetError: "Could not set the new password. Try again.",
    successTitle: "Logged in",
    successMessage: "You're logged in to the admin portal.",
    continueButton: "Go to queue",
    forgotPasswordLink: "Forgot password?",
  },
  adminPortal: {
    signOut: "Sign out",
    blockedTitle: "Account blocked",
    blockedMessage: "This account has been blocked following a report. Contact a super-admin for details.",
    roleAdmin: "Admin",
    roleCoordinator: "Coordinator",
    headerWithRegion: "{role} · {region}",
    headerNoRegion: "{role} · District-wide",
    navQueue: "Queue",
    navDonors: "Donors",
    navBanks: "Banks",
    navReports: "Reports",
    navAudit: "Audit log",
    navMetrics: "Metrics",
    pushToggle: {
      enableButton: "Enable notifications",
      errorLabel: "Couldn't enable — retry",
    },
    queue: {
      title: "Request queue",
      filterLabel: "Filter by stage",
      filterAllOption: "All stages",
      columnAge: "Age",
      columnUrgency: "Urgency",
      columnStage: "Stage",
      columnBloodGroup: "Blood group",
      columnProspects: "Prospects",
      columnOwner: "Owner",
      columnHandle: "Handle",
      urgencyNormal: "Normal",
      urgencyEmergency: "Emergency",
      ageMinutes: "{minutes}m ago",
      ageHours: "{hours}h {minutes}m ago",
      ownerUnassigned: "Unassigned",
      escalationFlag: "Past threshold",
      unownedAlertFlag: "Needs an owner",
      emptyMessage: "No requests match this filter.",
      noRegionMessage:
        "You're a district-wide coordinator with no home region, so there's no regional queue to show here.",
      handleButton: "Handle",
      handleTakenLabel: "Handled",
      confirmHandleMessage: "Take ownership of this request? Once handled, only you (or a coordinator) can act on it.",
      confirmHandleButton: "Confirm",
      cancelHandleButton: "Cancel",
      handleError: "Could not complete that action. Try again.",
    },
    myCases: {
      title: "My cases",
      emptyMessage: "You don't have any active cases right now.",
      prospectsLoadError: "Could not load prospects for this request. Try again.",
      loadingProspectsMessage: "Loading prospects...",
      assignError: "Could not complete that action. Try again.",
    },
    requestDetail: {
      title: "Request detail",
      notFoundMessage: "This request doesn't exist, or isn't in your region.",
      actionError: "Could not complete that action. Try again.",
      notYourCaseMessage: "Owned by another admin — you can view this request but can't act on it.",
      requesterPhoneLabel: "Requester phone",
      patientNameLabel: "Patient",
      patientNameUnknown: "Not given",
      bloodGroupLabel: "Blood group",
      ageLabel: "Age",
      unitsLabel: "Units needed",
      urgencyLabel: "Urgency",
      urgencyNormal: "Normal",
      urgencyEmergency: "Emergency",
      destinationBankLabel: "Destination bank",
      ownerLabel: "Owner",
      ownerUnassignedMessage: "Not assigned yet - this is an alert condition once prospects exist.",
      ownerYou: "You",
      takeOwnershipButton: "Take ownership",
      takeOwnershipDoneMessage: "You're now the owner of this request.",
      assignButton: "Assign to bank",
      assignDoneMessage: "Donor assigned to the bank. They'll now appear in the bank's incoming list.",
      unassignButton: "Unassign",
      unassignDoneMessage: "Donor unassigned. They no longer appear in the bank's incoming list.",
      assignedLabel: "Assigned to bank",
      notAssignedLabel: "Not yet assigned",
      transferLabel: "Transfer to region",
      selectRegionPlaceholder: "Select a region",
      transferButton: "Transfer",
      transferDoneMessage: "Transferred to {region}. Ownership moves to that region's primary admin.",
      closeButton: "Close request",
      closeReasonLabel: "Reason for closing",
      closeConfirmButton: "Confirm close",
      closeBackButton: "Back",
      invalidReason: "Select a reason before closing.",
      closeDoneMessage: "Request closed.",
      reportButton: "Report",
      reportReasonLabel: "Reason",
      selectReportReasonPlaceholder: "Select a reason",
      reportReasonPaymentDemanded: "Asked for payment for blood",
      reportReasonAbusiveBehavior: "Abusive or harassing",
      reportReasonSuspectedFraud: "Suspected fraud / fake request",
      reportReasonOther: "Other",
      reportDetailsLabel: "Additional details (optional)",
      reportDetailsPlaceholder: "What happened?",
      reportConfirmButton: "Submit report",
      reportCancelButton: "Cancel",
      invalidReportReason: "Select a reason before submitting.",
      reportDoneMessage: "Report submitted.",
      prospectsTitle: "Prospects",
      prospectsEmptyMessage: "No prospects yet.",
      prospectStatusInvited: "Invited",
      prospectStatusAccepted: "Accepted",
      prospectStatusScreening: "Screening",
      prospectStatusDonated: "Donated",
      prospectStatusRejected: "Rejected",
      prospectStatusNoShow: "No show",
      prospectStatusStoodDown: "Stood down",
      invitedAtLabel: "Invited",
      respondedAtLabel: "Responded",
      outcomeAtLabel: "Outcome",
      callDonorButton: "Call donor",
      standDownButton: "Stand down",
      standDownDoneMessage: "Prospect stood down.",
      timelineTitle: "Event timeline",
    },
    donorLookup: {
      title: "Donor lookup",
      noRegionMessage: "You're a district-wide coordinator with no home region, so there's no regional donor list to show here.",
      bloodGroupFilterLabel: "Blood group",
      allBloodGroupsOption: "All groups",
      pincodeFilterLabel: "PIN code",
      allPincodesOption: "All PIN codes",
      availableOnlyLabel: "Available only",
      emptyMessage: "No donors match this filter.",
      columnName: "Name",
      columnBloodGroup: "Blood group",
      columnPincode: "PIN code",
      columnStatus: "Status",
      columnAction: "Action",
      statusAvailable: "Available",
      statusPaused: "Paused until {date}",
      statusCooldown: "In cooldown until {date}",
      statusUnavailable: "Not available",
      revealButton: "Reveal contact",
      phoneLabel: "Phone",
      selectRequestLabel: "Which open request is this for?",
      selectRequestPlaceholder: "Select a request",
      noOpenRequestsMessage: "No open requests in your region right now - contact reveal requires an active request to tie the lookup to.",
      reasonLabel: "Reason for contacting this donor",
      reasonPlaceholder: "e.g. asking if they can donate for this request",
      revealConfirmButton: "Confirm reveal",
      revealCancelButton: "Cancel",
      errorNoOpenRequest: "That request is no longer open. Choose a current one.",
      errorInvalidReason: "Enter a reason before revealing contact details.",
      errorRateLimited: "You've reached the reveal limit for this hour. Try again later.",
      errorGeneric: "Could not reveal contact details. Try again.",
      prevPageButton: "Previous",
      nextPageButton: "Next",
    },
    bankManagement: {
      title: "Bank management",
      noRegionMessage: "You're a district-wide coordinator with no home region, so there's no regional bank list to show here.",
      addressLabel: "Address",
      phoneLabel: "Phone",
      verifiedLabel: "Verified",
      unverifiedLabel: "Not verified",
      verifyButton: "Verify",
      revokeVerificationButton: "Revoke verification",
      activeLabel: "Active",
      suspendedLabel: "Suspended",
      suspendButton: "Suspend",
      reactivateButton: "Reactivate",
      policyNotesLabel: "Policy notes",
      saveButton: "Save",
      savedMessage: "Saved.",
      emptyMessage: "No banks in your region yet.",
      actionError: "Could not complete that action. Try again.",
      nameLabel: "Name",
      licenceNoLabel: "Licence number",
      pincodeLabel: "PIN code",
      staffEmailLabel: "Staff email",
      staffFullNameLabel: "Staff full name",
      addBankTitle: "Add a bank",
      addBankButton: "Add bank",
      addingBank: "Adding...",
      tempPasswordIntro: "Temporary password for {email} — shown once, won't be shown again:",
      copyButton: "Copy",
      copiedLabel: "Copied",
      dismissButton: "Dismiss",
      relayPasswordNote: "Relay this to the bank's staff yourself, then dismiss.",
      editButton: "Edit",
      cancelButton: "Cancel",
      saveDetailsButton: "Save details",
      detailsSavedMessage: "Details saved.",
      requiredFieldError: "Name, address, and phone are all required.",
      invalidEmailError: "Enter a valid staff email address.",
      pincodeNotFoundError: "PIN code does not exist.",
    },
    moderation: {
      title: "Moderation",
      emptyMessage: "No reports match this filter.",
      filterLabel: "Status",
      filterAllOption: "All reports",
      filterOpenOption: "Open only",
      statusOpen: "Open",
      statusBlocked: "User blocked",
      reporterLabel: "Reported by",
      subjectLabel: "Reported user",
      roleDonor: "Donor",
      roleSearcher: "Searcher",
      roleBankStaff: "Bank staff",
      roleAdmin: "Admin",
      roleCoordinator: "Coordinator",
      reasonLabel: "Reason",
      detailsLabel: "Details",
      reportedAtLabel: "Reported",
      blockButton: "Block user",
      blockedLabel: "Blocked",
      blockDoneMessage: "User blocked.",
      actionError: "Could not complete that action. Try again.",
    },
    auditLog: {
      title: "Audit log",
      coordinatorOnlyBanner: "Coordinator access only",
      emptyMessage: "No audit entries match this filter.",
      filterLabel: "Action",
      filterAllOption: "All actions",
      columnTimestamp: "When",
      columnActor: "Actor",
      columnAction: "Action",
      columnEntity: "Entity",
      actionViewContact: "Viewed contact",
      actionTransferRegion: "Transferred region",
      actionCloseRequest: "Closed request",
      actionBlockUser: "Blocked user",
      actionAssignToBank: "Assigned to bank",
      actionUnassignFromBank: "Unassigned from bank",
      actionTakeOwnership: "Took ownership",
      actionFileReport: "Filed report",
      entityDonor: "Donor",
      entityRequest: "Request",
      entityProfile: "Profile",
      entityProspect: "Prospect",
      prevPageButton: "Previous",
      nextPageButton: "Next",
    },
    metrics: {
      title: "Metrics",
      fullHistoryNote: "These figures reflect the platform's full history - there is no date-range filter yet.",
      prospectsPerDonationLabel: "Prospects invited per successful donation",
      resolvedRateLabel: "Requests reaching resolved",
      firstAcceptanceLabel: "Median time to first acceptance",
      acceptanceToDonationLabel: "Median time from acceptance to donation",
      foundElsewhereLabel: "Requests closed as found elsewhere",
      tier1Label: "Tier 1 hit rate (stock found, no request needed)",
      tier1SampleSince: "Since {date}",
      tier1SampleSize: "{count} searches counted",
      notEnoughData: "Not enough data yet",
      durationMinutes: "{value} min",
      donorResponseTitle: "Donor decline / ignore rate by month",
      donorResponseColumnMonth: "Month",
      donorResponseColumnTotal: "Invited",
      donorResponseColumnDeclined: "Declined",
      donorResponseColumnIgnored: "Ignored",
      adminResponseTitle: "Admin response time distribution",
      adminResponseMedianLabel: "Median response time",
      adminResponseSampleLabel: "{count} responses counted",
      bucketUpTo1h: "Up to 1 hour",
      bucket1To4h: "1-4 hours",
      bucket4To12h: "4-12 hours",
      bucket12To24h: "12-24 hours",
      bucketOver24h: "Over 24 hours",
    },
  },
  footer: {
    privacyLink: "Privacy notice",
    termsLink: "Terms of service",
  },
  siteHeader: {
    brandName: "Blood Link",
  },
  privacyPage: {
    title: "Privacy notice",
    intro:
      "This platform connects people who need blood with donors and blood banks in the Uttara Kannada district, coordinated by regional volunteer admins. This page explains what information we collect and how it is used.",
    whatWeCollectTitle: "What we collect",
    whatWeCollectBody:
      "If you register as a donor: your name, date of birth, blood group, and PIN code. If you raise a request: your phone number, the patient's first name only (never a surname, diagnosis, or hospital record), blood group, and destination bank. Everyone verifying by phone provides a phone number for OTP login. All of this is stored securely on our server — never only on your own device.",
    whoSeesItTitle: "Who can see your information",
    whoSeesItBody:
      "A donor's name and blood group are visible to regional volunteer admins and blood banks, so they can find compatible donors. A donor's phone number is shared only after they accept a specific donation request — never before, and never in search results. A requester's contact details are visible only to the admin and blood bank handling that specific request.",
    yourRightsTitle: "Your rights",
    yourRightsBody:
      "Registered donors can edit their blood group, PIN code, and name at any time, pause notifications, and delete their account entirely from Settings. Deleting your account stands down any active pledge and removes your donor record from matching immediately.",
    grievanceTitle: "Grievance contact",
    grievanceBody:
      "PLACEHOLDER Grievance Officer, Lions Club Uttara Kannada — grievance@lionsclub-uttarakannada.example, +91 00000 00000. (Real contact details pending Lions Club confirmation.)",
  },
  termsPage: {
    title: "Terms of service",
    intro:
      "By using this platform, you agree to the following terms. This platform exists to connect blood donors, requesters, and blood banks — not to facilitate any commercial transaction in blood.",
    prohibitedTitle: "Buying or selling blood is prohibited",
    prohibitedBody:
      "Selling or buying blood is illegal in India. It is strictly prohibited on this platform. Any account found offering or requesting payment in exchange for blood will be reported and blocked.",
    noPaymentsBody:
      "This platform never offers payments, incentives, or rewards of any kind for donating blood, and never will.",
    reportBody:
      "If you believe someone is violating these terms — including asking for or offering payment — please report it so a regional admin can review it.",
  },
};

export default en;
