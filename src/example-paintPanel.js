/**
 * Paint panel.
 */

MeasureConverter.PaintPanel = function (containerId) {
    this.containerId = containerId;
};

MeasureConverter.PaintPanel.prototype = {

    init: function () {
        this._initMarkup(this.containerId);
    },

    _initMarkup: function (containerId) {
        var container = $('#' + containerId);

		var self = this;

		container.append('<div class="sc-no-default-cmd">Компонент конвертирования единиц измерения</div>');
		container.append(
			'<select size="1" id="measureType"> \
				<option disabled selected>Выберите конвертируемый параметр</option> \
			</select></br>'
		);

		var newOption = new Option();

		container.append(
			'<select size="1" id="convertibleMeasure"> \
				<option disabled selected>Выберите конвертируемую единицу измерения</option> \
			</select> \
			<select size="1" id="convertedMeasure"> \
				<option disabled selected>Выберите конвертированную единицу измерения</option> \
			</select></br>'
		);
		container.append('<input type="text" value="" id="convertingValue" style="width:330px" placeholder="Введите значение конвертируемой величины"/>');
		container.append('<p><button id="convertMeasure" type="button">Конвертировать</button></p>');

        $('#convertMeasure').click(function () {
			self._showMainMenuNode();
		});
    },

    /* Call agent of searching semantic neighborhood,
	send ui_main_menu node as parameter and add it in web window history
	*/
	_showMainMenuNode: function () {
		var addr;
		// Resolve sc-addr. Get sc-addr of ui_main_menu node
		SCWeb.core.Server.resolveScAddr(['ui_main_menu'], function (keynodes) {
			addr = keynodes['ui_main_menu'];
			// Resolve sc-addr of ui_menu_view_full_semantic_neighborhood node
			SCWeb.core.Server.resolveScAddr(["ui_menu_view_full_semantic_neighborhood"],
			function (data) {
				// Get command of ui_menu_view_full_semantic_neighborhood
				var cmd = data["ui_menu_view_full_semantic_neighborhood"];
				// Simulate click on ui_menu_view_full_semantic_neighborhood button
				SCWeb.core.Main.doCommand(cmd,
				[addr], function (result) {
					// waiting for result
					if (result.question != undefined) {
						// append in history
						SCWeb.ui.WindowManager.appendHistoryItem(result.question);
					}
				});
			});
		});
	},

	_findMainIdentifier: function () {
		console.log("inFind");
		var main_menu_addr, nrel_main_idtf_addr;
		// Resolve sc-addrs.
		SCWeb.core.Server.resolveScAddr(['ui_main_menu', 'nrel_main_idtf'], function (keynodes) {
			main_menu_addr = keynodes['ui_main_menu'];
			nrel_main_idtf_addr = keynodes['nrel_main_idtf'];
			console.log(main_menu_addr);
			console.log(nrel_main_idtf_addr);
			// Resolve sc-addr of ui_menu_view_full_semantic_neighborhood node
			window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_5F_A_A_A_F, [
 				main_menu_addr,
 				sc_type_arc_common | sc_type_const,
 				sc_type_link,
 				sc_type_arc_pos_const_perm,
 				nrel_main_idtf_addr]).
			done(function(identifiers){	 
				 window.sctpClient.get_link_content(identifiers[0][2],'string').done(function(content){
				 	alert('Главный идентификатор: ' + content);
				 });			
			});
		});
	},

	_findAllConvertibleMeasure: function () {
		SCWeb.core.Server.resolveScAddr(['nrel_conversion_rate'], function (keynodes) {
			var nrel_conversion_rate_addr = keynodes['nrel_conversion_rate'];

			window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_5A_A_A_A_F, [
				sc_type_node | sc_type_const,
				sc_type_arc_common | sc_type_const,
				sc_type_node | sc_type_const,
				sc_type_arc_common | sc_type_const,
				nrel_conversion_rate_addr]).
			done(function (identifiers) {
				
			});
		});
	}
};