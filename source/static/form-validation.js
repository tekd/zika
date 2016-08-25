$(document).ready(function() {
  $(document).ready(function() {

    var firstNameInput = $("#entry_1253314825"),
        lastNameInput = $("#entry_579020446"),
        emailInput = $("#entry_945637751"),
        organizationInput = $("#entry_1431036681"),
        conferenceSelection1Input = $("#group_1463462154_1"),
        conferenceSelection2Input = $("#group_1463462154_2"),
        conferenceSelection3Input = $("#group_1463462154_3"),
        conferenceSelection4Input = $("#group_1463462154_4"),
        conferenceSelection5Input = $("#group_1463462154_5"),
        conferenceSelection6Input = $("#group_1463462154_6"),
        pastParticipantsYesInput = $('#group_351358348_1'),
        pastParticipantsNoInput = $('#group_351358348_2'),
        aboutMeRequiredInput = $("#entry_2034790886"),
        aboutMeNotRequiredInput = $("#entry_1375254264"),
        cityInput = $("#entry_1389641910"),
        countryInput = $("#entry_344739365"),
        otherParticipantsInput = $("#entry_2129327437");

    var requiredFields = [firstNameInput,lastNameInput,emailInput, organizationInput, aboutMeRequiredInput, cityInput, countryInput];

    function noNullFields() { 
      var noBlankFields=true;
      requiredFields.forEach(function(data) {
        if (data.val()) {
          console.log(data.val());
          $(data).removeClass("invalid").addClass("valid");
        } else {
          $(data).removeClass("valid").addClass("invalid");
          noBlankFields = false;
        }
      });
        if (!noBlankFields) {
          $('.error-messages').append('<p>Please fill out all required fields</p>');
        }
      return noBlankFields;
    }

    function validateEmailAddress() {
      var email = emailInput.val();
      var regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
      var valid_email=regex.test(email);
      if(valid_email) {
        emailInput.removeClass("invalid").addClass("valid");
      }
      else {
        emailInput.removeClass("valid").addClass("invalid");
        $('.error-messages').append('<p>Please provide a valid email address</p>');
        validatedEmail = false;
      }
      return valid_email;
    }

    function validateConferenceSelect() {

      var selectionCount = 0;
      var conferences = [conferenceSelection1Input,conferenceSelection2Input,conferenceSelection3Input,conferenceSelection4Input,conferenceSelection5Input,conferenceSelection6Input];

      conferences.forEach(function(conference) {
        if (conference.is(":checked")) {
          selectionCount += 1;
        }
      });

      console.log(selectionCount);

      if (selectionCount < 1) {
        $('.error-messages').append('<p>Please select a conference.</p>');
        return false;
      } else {
        return true;
      }


    }


    var pastParticipantCheck = $('input[name="entry.351358348"]');

    function validatePastParticipants() {

      if ($('#group_351358348_1').is(":checked") || $('#group_351358348_2').is(":checked")) {
        return true;
      } else {
        $('.error-messages').append('<p>Please fill out all required fields.</p>');
        return false
      }
    }

    // TOGGLE REQUIRED FIELDS
    // pastParticipantCheck.change(function() {
    //     var labelRequired = $('label[for="'+ aboutMeRequiredInput.attr("id") +'"]');
    //     // labelRequired.find(".form-field-title").removeClass('field-required');
    //     var labelNotRequired = $('label[for="'+ aboutMeNotRequiredInput.attr("id") +'"]');
    //     // labelNotRequired.find(".form-field-title").addClass('field-required')
    //   if ($('#group_351358348_1').is(":checked")) {
    //     var i = requiredFields.indexOf(aboutMeRequiredInput);
    //     if ( i != -1) {
    //       requiredFields.splice(i, 1);
    //     }
    //     aboutMeRequiredInput.removeClass("invalid").addClass("valid");
    //     var existingContent = aboutMeRequiredInput.val();
    //     aboutMeRequiredInput.val("See Previous Application " + existingContent);
    //     aboutMeRequiredInput.hide();
    //     labelRequired.hide();
    //     aboutMeNotRequiredInput.show();
    //     labelNotRequired.show();
    //   } else if ($('#group_351358348_2').is(":checked")) {
    //     aboutMeRequiredInput.attr("required", true);
    //     requiredFields.push(aboutMeRequiredInput);
    //     var existingContent = aboutMeRequiredInput.val();
    //     var newContent = existingContent.replace("See Previous Application ","");
    //     aboutMeRequiredInput.val(newContent)
    //     aboutMeRequiredInput.show();
    //     labelRequired.show();
    //     labelNotRequired.hide();
    //     aboutMeNotRequiredInput.hide();
    //   }
    // });

    // END TOGGLE REQUIRED FIELDS

    var validated = false;

    $("#form-submit").on("click", function(e) {
      validateForm();
      if (!validated) {
        liveValidateNullFields(requiredFields);
        $('html, body').animate({
          scrollTop: $(".error-messages").offset().top
      }, 200);
        console.log("Form not submitted");
        e.preventDefault();
      } else {
        console.log('Form submitted successfully!');
      }

    });


    function validateForm() {
      $('.error-messages').text("");
        validated = noNullFields(requiredFields) && validateEmailAddress() && validateConferenceSelect() && validatePastParticipants() ;
    }

    function liveValidateNullFields(requiredFields) {  
      requiredFields.forEach(function(field) {
        field.on("input", function() {
          if (!field.val()) {
            $(this).removeClass("valid").addClass("invalid");
          } else {
            $(this).removeClass("invalid").addClass("valid");
          }
        });
      });
    }





  });
});