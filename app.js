angular.module("beamng.apps").directive("analogSpeedometer", [
	function () {
		return {
			templateUrl: "/ui/modules/apps/AnalogSpeedometer/app.html",
			replace: true,
			restrict: "EA",
			scope: true,
			controller: [
				"$scope",
				function ($scope) {
					$scope.isWhiteTheme = false;

					$scope.toggleTheme = function (event) {
						if (event && event.target.closest('.stat-block')) {
							return;
						}

						$scope.isWhiteTheme = !$scope.isWhiteTheme;
						$scope.$applyAsync();
					};

					$scope.speedKmh = 0;
					$scope.rpm = 0;
					$scope.gearName = "N";
					$scope.maxRpm = 7000;	// стандартное значение, потом обновится из electris.maxrpm

					// Дополнительные показатели
					$scope.extraPanelVisible = false;
					$scope.ps = 0;
					$scope.hp = 0;
					$scope.kg = 0;
					$scope.psPerKg = 0;
					$scope.hpPerKg = 0;

					$scope.toggleExtraPanel = function (event) {
						if (event) {
							event.stopPropagation(); // чтобы не переключать тему
						}
						$scope.extraPanelVisible = !$scope.extraPanelVisible;
						$scope.$applyAsync();
					};

					// Единицы измерения
					$scope.useMph = false;
					$scope.speedUnit = "km/h";
					$scope.displayedSpeed = 0;

					// Настройка точек
					const DOT_COUNT = 20;
					$scope.dots = [];
					for (let i = 0; i < DOT_COUNT; i++) {
						$scope.dots.push({ style: { background: "#1e1e1e", boxShadow: "none" } });
					}

					// Цвет полосы тахометра и дуги
					$scope.rpmBarColor = "#22c55e";

					// Флаг мигания (для CSS класса)
					$scope.isFlashing = false;
					const FLASHING_OFFSET = 200;

					// Параметры дуги вокруг передачи
					const FULL_CIRCLE = 2 * Math.PI * 44;						// ≈ 276.46
					const ARC_FRACTION = 0.95;											// 95% окружности
					const ARC_LENGTH = FULL_CIRCLE * ARC_FRACTION;	// 262.64
					const GAP = FULL_CIRCLE - ARC_LENGTH;           // 13.82
					const DASH_OFFSET = -ARC_LENGTH / 4;						// сдвиг для разрыва справа

					$scope.gearArcDasharray = `0 ${FULL_CIRCLE}`;
					$scope.gearArcColor = "#22c55e";

					// Вспомогательные функции
					function updateExtraStats(psVal, hpVal, kgVal) {
						$scope.ps = psVal;
						$scope.hp = hpVal;
						$scope.kg = kgVal;
						if (kgVal > 0) {
							$scope.psPerKg = psVal / kgVal;
							$scope.hpPerKg = hpVal / kgVal;
						} else {
							$scope.psPerKg = 0;
							$scope.hpPerKg = 0;
						}
						$scope.$applyAsync();
					}

					function getDotColor(progress) {
						// progress от 0 (зелёный) до 1 (красный)
						if (progress >= 0.99) return "#ff0000";
						const r = Math.min(255, Math.floor(34 + (255 - 34) * progress));
						const g = Math.min(197, Math.floor(197 - 197 * progress));
						const b = Math.min(94, Math.floor(94 - 94 * progress));
						return `rgb(${r}, ${g}, ${b})`;
					}

					function getRpmBarColor(rpm, maxRpm) {
						if (rpm >= maxRpm) return "#ff0000";
						if (rpm >= maxRpm - 1000) {
							// Переход от жёлтого к красному
							const t = (rpm - (maxRpm - 1000)) / 1000;
							const r = Math.floor(234 + (255 - 234) * t);
							const g = Math.floor(179 + (0 - 179) * t);
							const b = Math.floor(8 + (0 - 8) * t);
							return `rgb(${r}, ${g}, ${b})`;
						}
						if (rpm >= maxRpm - 2000) {
							// Переход от зелёного к жёлтому
							const t = (rpm - (maxRpm - 2000)) / 1000;
							const r = Math.floor(34 + (234 - 34) * t);
							const g = Math.floor(197 + (179 - 197) * t);
							const b = Math.floor(94 + (8 - 94) * t);
							return `rgb(${r}, ${g}, ${b})`;
						}
						return "#22c55e";
					}

					function updateGearArc() {
						const rpm = $scope.rpm;
						const maxRpm = $scope.maxRpm;
						if (maxRpm <= 0) return;
						// Для дуги ограничиваем ratio до 1 (не больше 100%)
						let ratio = Math.min(rpm / maxRpm, 1);
						const filledLength = ratio * ARC_LENGTH;
						const remaining = ARC_LENGTH - filledLength + GAP;
						$scope.gearArcDasharray = `${filledLength} ${remaining}`;
						$scope.gearArcColor = $scope.rpmBarColor;
					}

					function updateDotsAndBarColor() {
						const rpm = $scope.rpm;
						const maxRpm = $scope.maxRpm;
						if (maxRpm <= 0) return;

						// Цвет полосы (при rpm > maxRpm цвет красный)
						$scope.rpmBarColor = getRpmBarColor(rpm, maxRpm);

						// Точки активны только в диапазоне [maxRpm-1000 .. maxRpm]
						// Если rpm > maxRpm, точки все зажжены красным
						const zoneStart = Math.max(0, maxRpm - 1000);
						let zoneProgress = 0;
						if (rpm >= maxRpm) zoneProgress = 1;
						else if (rpm <= zoneStart) zoneProgress = 0;
						else zoneProgress = (rpm - zoneStart) / 1000;

						const activeDotsCount = Math.floor(zoneProgress * DOT_COUNT);
						for (let i = 0; i < DOT_COUNT; i++) {
							if (i < activeDotsCount) {
								const dotProgress = i / (DOT_COUNT - 1);
								const color = getDotColor(dotProgress);
								$scope.dots[i].style = {
									background: color,
									boxShadow: `0 0 3px ${color}`
								};
							} else {
								$scope.dots[i].style = {
									background: "#1e1e1e",
									boxShadow: "none"
								};
							}
						}

						updateGearArc();

						// Управление миганием
						const shouldFlash = rpm >= (maxRpm - FLASHING_OFFSET);
						if (shouldFlash && !$scope.isFlashing) {
							$scope.isFlashing = true;
						} else if (!shouldFlash && $scope.isFlashing) {
							$scope.isFlashing = false;
						}
					}

					function updateDisplayedSpeed() {
						if ($scope.useMph) {
							$scope.displayedSpeed = $scope.speedKmh * 0.621371;
							$scope.speedUnit = "mph";
						} else {
							$scope.displayedSpeed = $scope.speedKmh;
							$scope.speedUnit = "km/h";
						}
					}

					$scope.toggleUnits = function () {
						$scope.useMph = !$scope.useMph;
						updateDisplayedSpeed();
						$scope.$applyAsync();
					};

					// Тянем данные
					const streams = ["electrics", "engineInfo"];
					StreamsManager.add(streams);

					$scope.$on("destroy", function () {
						StreamsManager.remove(streams);
					});

					$scope.$on("streamsUpdate", function (event, streamsData) {
						let changed = false;
						if (!streamsData.electrics) return;
						const electronicsData = streamsData.electrics;

						if (electronicsData.maxrpm !== undefined && electronicsData.maxrpm > 0 && $scope.maxRpm !== electronicsData.maxrpm) {
							$scope.maxRpm = electronicsData.maxrpm;
							changed = true;
						}

						// Скорость
						if (electronicsData.wheelspeed !== undefined) {
							let newSpeedKmh = electronicsData.wheelspeed * 3.6;
							if (Math.abs($scope.speedKmh - newSpeedKmh) > 0.05) {
								$scope.speedKmh = newSpeedKmh;
								updateDisplayedSpeed();
								changed = true;
							}
						}

						// Оборотес
						if (electronicsData.rpm !== undefined) {
							let newRpm = electronicsData.rpm;
							if ($scope.rpm !== newRpm) {
								$scope.rpm = newRpm;
								updateDotsAndBarColor();
								changed = true;
							}
						}

						// Передача
						if (electronicsData.gear !== undefined) {
							let gearRaw = electronicsData.gear;
							let gearDisplay = "N";
							if (gearRaw === -1) gearDisplay = "R";
							else if (gearRaw === 0) gearDisplay = "N";
							else if (gearRaw > 0 || gearRaw.isString()) gearDisplay = gearRaw.toString();
							if ($scope.gearName !== gearDisplay) {
								$scope.gearName = gearDisplay;
								console.log(streams.engineInfo)
								changed = true;
							}
						}

						if (changed) {
							$scope.$applyAsync();
						}
					});

					// Инициализация
					updateDisplayedSpeed();
					updateDotsAndBarColor();
				}
			]
		};
	}
]);