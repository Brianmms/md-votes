/**
 * Generates the Tier Form with conditional logic.
 * Run this function in Google Apps Script (script.google.com)
 */
function createTierForm() {
  // Create a new form
  var form = FormApp.create('Registro de Tiers y Series');
  form.setDescription('Por favor selecciona tu tier para continuar con el registro de las series correspondientes.');

  // 1. Initial Section: Basic Info
  form.addTextItem().setTitle('Email').setRequired(true);
  form.addTextItem().setTitle('Nick / Nombre de Usuario').setRequired(true);

  // 2. The Tier Selection (This is the "Logic" question)
  var tierQuestion = form.addMultipleChoiceItem()
    .setTitle('¿A qué Tier perteneces?')
    .setHelpText('Selecciona tu rango para ver las series que te corresponden.')
    .setRequired(true);

  // Data mapping: [Label, Number of series fields to create]
  var tierData = [
    ['Formación de base $5 (2 series)', 2],
    ['Un paso a formación de elixir $5 (3 series)', 3],
    ['Formación de elixir $10 (4 series)', 4],
    ['Un paso a Alma Naciente $10 (5 series)', 5],
    ['Alma Naciente $15 (6 series)', 6],
    ['Semi-Celestial $20 (8 series)', 8],
    ['Celestial $25 (10 series)', 10],
    ['Semi-Dios $35 (15 series)', 15],
    ['Dios $50 (20 series)', 20],
    ['Inmortal $100 (40 series)', 40],
    ['Staff (2 series)', 2]
  ];

  var choices = [];

  // 3. Create a Section for each Tier
  tierData.forEach(function(data) {
    var label = data[0];
    var numSeries = data[1];

    // Create the page break (Section)
    var section = form.addPageBreakItem()
      .setTitle('Registro: ' + label)
      .setHelpText('Debes completar las ' + numSeries + ' series para este rango.')
      .setGoToPage(FormApp.PageNavigationType.SUBMIT); // Submit after finishing this section

    // Add the series inputs for this specific section
    for (var i = 1; i <= numSeries; i++) {
      form.addTextItem()
          .setTitle('Serie #' + i + ' (' + label + ')')
          .setRequired(true);
    }

    // Link this section to the main choice
    choices.push(tierQuestion.createChoice(label, section));
  });

  // 4. Assign the choices to the Tier question to enable navigation logic
  tierQuestion.setChoices(choices);

  Logger.log('Formulario creado con éxito!');
  Logger.log('URL de edición: ' + form.getEditUrl());
  Logger.log('URL para ver el formulario: ' + form.getPublishedUrl());
}
