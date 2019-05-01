var MeasureConverter = {};

function extend(child, parent) {
    var F = function () {
    };
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
    child.superclass = parent.prototype;
}

/**
 * MeasureConverter component.
 */
MeasureConverter.DrawComponent = {
    ext_lang: 'measure_converter',
    formats: ['format_measure_converter_json'],
    struct_support: true,
    factory: function (sandbox) {
        return new MeasureConverter.DrawWindow(sandbox);
    }
};

MeasureConverter.DrawWindow = function (sandbox) {
    this.sandbox = sandbox;
    this.paintPanel = new MeasureConverter.PaintPanel(this.sandbox.container);
    this.paintPanel.init();
    this.recieveData = function (data) {
        console.log("in recieve data" + data);
    };

    var scElements = {};

    function drawAllElements() {
        var dfd = new jQuery.Deferred();
       // for (var addr in scElements) {
            jQuery.each(scElements, function(j, val){
                var obj = scElements[j];
                if (!obj || obj.translated) return;
// check if object is an arc
                if (obj.data.type & sc_type_arc_pos_const_perm) {
                    var begin = obj.data.begin;
                    var end = obj.data.end;
                    // logic for component update should go here
                }

        });
        SCWeb.ui.Locker.hide();
        dfd.resolve();
        return dfd.promise();
    }

// resolve keynodes
    var self = this;
    this.needUpdate = false;
    this.requestUpdate = function () {
        var updateVisual = function () {
// check if object is an arc
            var dfd1 = drawAllElements();
            dfd1.done(function (r) {
                return;
            });


/// @todo: Don't update if there are no new elements
            window.clearTimeout(self.structTimeout);
            delete self.structTimeout;
            if (self.needUpdate)
                self.requestUpdate();
            return dfd1.promise();
        };
        self.needUpdate = true;
        if (!self.structTimeout) {
            self.needUpdate = false;
            SCWeb.ui.Locker.show();
            self.structTimeout = window.setTimeout(updateVisual, 1000);
        }
    }
    
    this.eventStructUpdate = function (added, element, arc) {
        window.sctpClient.get_arc(arc).done(function (r) {
            var addr = r[1];
            window.sctpClient.get_element_type(addr).done(function (t) {
                var type = t;
                var obj = new Object();
                obj.data = new Object();
                obj.data.type = type;
                obj.data.addr = addr;
                if (type & sc_type_arc_mask) {
                    window.sctpClient.get_arc(addr).done(function (a) {
                        obj.data.begin = a[0];
                        obj.data.end = a[1];
                        scElements[addr] = obj;
                        self.requestUpdate();
                    });
                }
            });
        });
    };
// delegate event handlers
    this.sandbox.eventDataAppend = $.proxy(this.receiveData, this);
    this.sandbox.eventStructUpdate = $.proxy(this.eventStructUpdate, this);
    this.sandbox.updateContent();
};
SCWeb.core.ComponentManager.appendComponentInitialize(MeasureConverter.DrawComponent);
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

		// стили
	    //$('head').append('<link rel="stylesheet" type="text/css" href="/static/components/css/measure_converter.css" />');

		container.append(
			'<div id="measure-converter"> \
				<h3>Компонент конвертирования единиц измерения</h3> \
				<div id="input-area"> \
					<div id="input-field"> \
						<label for="convertibleMeasure">Конвертируемая единица измерения</label> \
						<select size="1" id="convertibleMeasure"> \
							<option disabled selected>Единица измерения</option> \
						</select></br> \
					</div> \
					<div id="input-field"> \
						<label for="convertedMeasure">Конвертированная единица измерения</label> \
						<select size="1" id="convertedMeasure"> \
							<option disabled selected>Единица измерения</option> \
						</select></br> \
					</div> \
					<div id="input-field"> \
						<label for="convertingValue">Значение конвертируемой величины</label> \
						<input type="number" id="convertingValue" placeholder="Значение"/></br> \
					</div> \
					<button id="convertMeasure" type="button">Конвертировать</button> \
				</div> \
			</div>');

        $('#convertibleMeasure').click(function () {
			if ($('#convertibleMeasure').children().length === 1) {
				self._findAllConvertibleMeasures();
			}
		});

		$('#convertibleMeasure').change(function () {
			let childrens = $('#convertedMeasure').children();
			if (childrens.length > 1) {
				$('#convertedMeasure')
					.find('option')
					.remove()
					.end()
					.append('<option disabled selected>Единица измерения</option>');
			}

			let convertible_measure_addr = parseInt(this.value);
			self._findAllConvertedMeasures(convertible_measure_addr);
		});

		$('#convertMeasure').click(function () {
			try {
				let convertible_measure_option = $('#convertibleMeasure option:selected');
				let convertible_measure_addr = parseInt(convertible_measure_option.val());
				if (isNaN(convertible_measure_addr)) {
					throw "Не выбрана конвертируемая единица измерения!"
				}
	
				let converted_measure_option = $('#convertedMeasure option:selected');
				let converted_measure_addr = parseInt(converted_measure_option.val());
				if (isNaN(converted_measure_addr)) {
					throw "Не выбрана конвертированная единица измерения!"
				}
	
				let convert_measure = parseInt($('#convertingValue').val());
				if (isNaN(convert_measure)) {
					throw "Не введено значение конвертируемой величины или введено не число!"
				}
	
				self._convert(convertible_measure_addr, converted_measure_addr, convert_measure);
			} catch(e) {
				alert(e);
			}
		});
    },

	_findAllConvertibleMeasures: function () {
		var self = this;
		var convertible_measures_set = new Set();

		SCWeb.core.Server.resolveScAddr(['nrel_conversion_rate'], function (keynodes) {
			var nrel_conversion_rate_addr = keynodes['nrel_conversion_rate'];

			window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_A, [
				nrel_conversion_rate_addr,
				sc_type_arc_pos_const_perm,
				sc_type_arc_common | sc_type_const]).
			done(function (identifiers) {
				for (let i = 0; i < identifiers.length; i++) {
					var conversion_rate_common_arc_addr = identifiers[i][2];

					window.sctpClient.get_arc(conversion_rate_common_arc_addr).done(function(arc_nodes_1) {
						var measures_common_arc_addr = arc_nodes_1[0];

						window.sctpClient.get_arc(measures_common_arc_addr).done(function(arc_nodes_2) {
							var convertible_measure_select = $('#convertibleMeasure');
							var convertible_measure_addr = arc_nodes_2[0];
							var convertible_main_measure_addr = arc_nodes_2[1];

							self.addUniqueOption(convertible_measures_set, convertible_measure_select, convertible_measure_addr);
							self.addUniqueOption(convertible_measures_set, convertible_measure_select, convertible_main_measure_addr);
						});
					});
				}
			});
		});
	},

	addUniqueOption: function (options_set, select_item, element_addr) {
		var self = this;

		if (!options_set.has(element_addr)) {
			options_set.add(element_addr);
			self.addNewOptionAsElementWithAddr(select_item, element_addr);
		}
	},

	addNewOptionAsElementWithAddr: function (select_item, element_addr) {
		window.scHelper.getIdentifier(element_addr, SCWeb.core.Server._current_language).done(function(text) {
			let new_option = new Option(text, element_addr);
			select_item.append(new_option);
		});
	},

	_findAllConvertedMeasures: function (convertible_measure_addr) {
		var self = this;

		window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3F_A_A, [
			convertible_measure_addr,
			sc_type_arc_common | sc_type_const,
			sc_type_node]).
		done(function (identifiers_1) {
			var main_SI_converted_measure_addr = identifiers_1[0][2];

			self.addNewOptionAsElementWithAddr($('#convertedMeasure'), main_SI_converted_measure_addr);

			window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3A_A_F, [
				sc_type_node,
				sc_type_arc_common | sc_type_const,
				main_SI_converted_measure_addr]).
			done(function (identifiers_2) {
				for (let i = 0; i < identifiers_2.length; i++) {
					var converted_measure_addr = identifiers_2[i][0];

					if (converted_measure_addr !== convertible_measure_addr) {
						self.addNewOptionAsElementWithAddr($('#convertedMeasure'), converted_measure_addr);
					}
				}
			});
		});

		window.sctpClient.iterate_elements(SctpIteratorType.SCTP_ITERATOR_3A_A_F, [
			sc_type_node,
			sc_type_arc_common | sc_type_const,
			convertible_measure_addr]).
		done(function (identifiers_3) {
			for (let i = 0; i < identifiers_3.length; i++) {
				var converted_measure_addr = identifiers_3[i][0];
				self.addNewOptionAsElementWithAddr($('#convertedMeasure'), converted_measure_addr);
			}
		});
	},

	_convert: function (convertible_measure_addr, converted_measure_addr, convert_measure) {
		SCWeb.core.Server.resolveScAddr([
			'concept_amount', 
			'nrel_value', 
			'number', 
			'nrel_main_idtf',
			'rrel_convertible_measure',
			'rrel_converted_measure'], 
		function (keynodes) {
			var concept_amount_addr = keynodes['concept_amount'];
			var nrel_value_addr = keynodes['nrel_value'];
			var number_addr = keynodes['number'];
			var nrel_main_idtf_addr = keynodes['nrel_main_idtf'];
			var rrel_convertible_measure_addr = keynodes['rrel_convertible_measure'];
			var rrel_converted_measure_addr = keynodes['rrel_converted_measure'];

			window.sctpClient.create_node(sc_type_node | sc_type_const).done(function(node_addr_1) {
				window.sctpClient.create_arc(sc_type_arc_pos_const_perm, concept_amount_addr, node_addr_1);

				window.sctpClient.create_node(sc_type_node | sc_type_const).done(function(node_addr_2) {
					window.sctpClient.create_arc(sc_type_arc_common | sc_type_const, node_addr_2, node_addr_1).done(function(common_arc_addr) {
						window.sctpClient.create_arc(sc_type_arc_pos_const_perm, nrel_value_addr, common_arc_addr);
					});

					window.sctpClient.create_node(sc_type_node | sc_type_const).done(function(node_addr_3) {
						window.sctpClient.create_arc(sc_type_arc_pos_const_perm, node_addr_2, node_addr_3);
						window.sctpClient.create_arc(sc_type_arc_pos_const_perm, number_addr, node_addr_3).done(function(pos_const_perm_arc_addr) {
							window.sctpClient.create_arc(sc_type_arc_pos_const_perm, convertible_measure_addr, pos_const_perm_arc_addr);
						});

						window.sctpClient.create_arc(sc_type_arc_common | sc_type_const, node_addr_2, node_addr_1).done(function(common_arc_addr) {
							window.sctpClient.create_arc(sc_type_arc_pos_const_perm, nrel_value_addr, common_arc_addr);
						});

						window.sctpClient.create_link().done(function (link_addr) {
							window.sctpClient.set_link_content(link_addr, String(convert_measure));
							window.sctpClient.create_arc(sc_type_arc_common | sc_type_const, node_addr_3, link_addr).done(function (common_arc_addr) {
								window.sctpClient.create_arc(sc_type_arc_pos_const_perm, nrel_main_idtf_addr, common_arc_addr);
							});
						});
					});
				});

				window.sctpClient.create_node(sc_type_node | sc_type_const).done(function(node_addr_4) {
					window.sctpClient.create_arc(sc_type_arc_pos_const_perm, node_addr_4, node_addr_1);
					window.sctpClient.create_arc(sc_type_arc_pos_const_perm, node_addr_4, convertible_measure_addr).done(function(pos_const_perm_arc_addr) {
						window.sctpClient.create_arc(sc_type_arc_pos_const_perm, rrel_convertible_measure_addr, pos_const_perm_arc_addr);
					});

					window.sctpClient.create_arc(sc_type_arc_pos_const_perm, node_addr_4, converted_measure_addr).done(function(pos_const_perm_arc_addr) {
						window.sctpClient.create_arc(sc_type_arc_pos_const_perm, rrel_converted_measure_addr, pos_const_perm_arc_addr);
					});

					SCWeb.core.Server.resolveScAddr(["ui_menu_convert_measures"], function (data) {
						var cmd = data["ui_menu_convert_measures"];
						SCWeb.core.Main.doCommand(cmd, [node_addr_4], function (result) {
							if (result.question != undefined) {
								SCWeb.ui.WindowManager.appendHistoryItem(result.question);
							}
						});
					});
				});
			});
		});
	}
};