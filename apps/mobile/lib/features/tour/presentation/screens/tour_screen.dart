import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../models/tour.dart';
import '../../../../providers/api_provider.dart';
import '../../../../providers/auth_provider.dart';
import '../../application/tour_draft_controller.dart';

class TourScreen extends ConsumerStatefulWidget {
  const TourScreen({super.key});

  @override
  ConsumerState<TourScreen> createState() => _TourScreenState();
}

class _TourScreenState extends ConsumerState<TourScreen> {
  final _dateController = TextEditingController();
  final _startTimeController = TextEditingController();
  final _clientController = TextEditingController();
  final _durationController = TextEditingController();
  final _bufferController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final state = ref.read(tourDraftControllerProvider);
    _syncControllers(state);
  }

  @override
  void dispose() {
    _dateController.dispose();
    _startTimeController.dispose();
    _clientController.dispose();
    _durationController.dispose();
    _bufferController.dispose();
    super.dispose();
  }

  void _syncControllers(TourDraftState state) {
    _dateController.text = state.date;
    _startTimeController.text = state.startTime;
    _clientController.text = state.clientName ?? '';
    _durationController.text = '${state.defaultDurationMinutes}';
    _bufferController.text = '${state.defaultBufferMinutes}';
  }

  void _updateSchedule({
    String? date,
    String? startTime,
    String? clientName,
    int? defaultDurationMinutes,
    int? defaultBufferMinutes,
  }) {
    ref.read(tourDraftControllerProvider.notifier).setSchedule(
          date: date,
          startTime: startTime,
          clientName: clientName,
          defaultDurationMinutes: defaultDurationMinutes,
          defaultBufferMinutes: defaultBufferMinutes,
        );
  }

  Future<void> _saveDraft(bool isAuthenticated) async {
    await ref
        .read(tourDraftControllerProvider.notifier)
        .persistDraft(isAuthenticated: isAuthenticated);
  }

  Future<void> _deleteCurrentTour(Tour tour, bool isAuthenticated) async {
    await ref.read(tourDraftControllerProvider.notifier).deletePersistedTour(
          isAuthenticated: isAuthenticated,
          id: tour.id,
        );
  }

  void _clearDraft() {
    ref.read(tourDraftControllerProvider.notifier).reset();
    _syncControllers(ref.read(tourDraftControllerProvider));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(tourDraftControllerProvider);
    final authState = ref.watch(authProvider);
    final tourEngineEnabled = ref.watch(brandConfigProvider).maybeWhen(
          data: (brand) => brand.features?.tourEngine == true,
          orElse: () => false,
        );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tour'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _TourSummary(state: state),
              if (state.error != null) ...[
                const SizedBox(height: 12),
                _TourMessage(
                  key: const ValueKey('tour-error'),
                  message: state.error!,
                  tone: _TourMessageTone.error,
                ),
              ],
              if (state.currentTour != null) ...[
                const SizedBox(height: 12),
                _SavedTourCard(
                  tour: state.currentTour!,
                  isDeleting: state.isPersisting,
                  canDelete: authState.isAuthenticated,
                  onDelete: () => _deleteCurrentTour(
                    state.currentTour!,
                    authState.isAuthenticated,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              _ScheduleSection(
                dateController: _dateController,
                startTimeController: _startTimeController,
                clientController: _clientController,
                durationController: _durationController,
                bufferController: _bufferController,
                onDateChanged: (value) => _updateSchedule(date: value.trim()),
                onStartTimeChanged: (value) =>
                    _updateSchedule(startTime: value.trim()),
                onClientChanged: (value) => _updateSchedule(
                  clientName: value.trim().isEmpty ? null : value.trim(),
                ),
                onDurationChanged: (value) {
                  final minutes = int.tryParse(value);
                  if (minutes != null && minutes > 0) {
                    _updateSchedule(defaultDurationMinutes: minutes);
                  }
                },
                onBufferChanged: (value) {
                  final minutes = int.tryParse(value);
                  if (minutes != null && minutes >= 0) {
                    _updateSchedule(defaultBufferMinutes: minutes);
                  }
                },
              ),
              const SizedBox(height: 16),
              _StopsSection(
                stops: state.stops,
                onRemove: (index) =>
                    ref.read(tourDraftControllerProvider.notifier).removeStopAt(
                          index,
                        ),
                onMoveUp: (index) => ref
                    .read(tourDraftControllerProvider.notifier)
                    .reorderStop(index, index - 1),
                onMoveDown: (index) => ref
                    .read(tourDraftControllerProvider.notifier)
                    .reorderStop(index, index + 2),
              ),
              const SizedBox(height: 16),
              if (!tourEngineEnabled)
                const _TourMessage(
                  key: ValueKey('tour-engine-disabled'),
                  message: 'Tour saving is not enabled for this brand.',
                  tone: _TourMessageTone.info,
                )
              else
                _PersistActions(
                  state: state,
                  isAuthenticated: authState.isAuthenticated,
                  onSave: () => _saveDraft(authState.isAuthenticated),
                ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                key: const ValueKey('clear-tour-draft'),
                onPressed: _clearDraft,
                icon: const Icon(Icons.delete_sweep_outlined),
                label: const Text('Clear draft'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TourSummary extends StatelessWidget {
  final TourDraftState state;

  const _TourSummary({required this.state});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Planner',
          style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          '${state.stops.length} ${state.stops.length == 1 ? 'stop' : 'stops'} in local draft',
          style: textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        _SchedulePreview(state: state),
      ],
    );
  }
}

class _SchedulePreview extends StatelessWidget {
  final TourDraftState state;

  const _SchedulePreview({required this.state});

  @override
  Widget build(BuildContext context) {
    final totalMinutes = _totalTourMinutes(state);
    final endTime = _addMinutesToTime(state.startTime, totalMinutes);
    final timeLabel = endTime == null
        ? '${state.startTime} start'
        : '${state.startTime}-$endTime';
    final dateLabel = state.date.isEmpty ? 'Date not set' : state.date;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _SummaryChip(
          key: const ValueKey('tour-date-summary'),
          icon: Icons.event,
          label: dateLabel,
        ),
        _SummaryChip(
          key: const ValueKey('tour-time-summary'),
          icon: Icons.schedule,
          label: timeLabel,
        ),
        _SummaryChip(
          key: const ValueKey('tour-duration-summary'),
          icon: Icons.timer_outlined,
          label: '$totalMinutes min estimate',
        ),
      ],
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _SummaryChip({
    super.key,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: colorScheme.onSurfaceVariant),
            const SizedBox(width: 6),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class _ScheduleSection extends StatelessWidget {
  final TextEditingController dateController;
  final TextEditingController startTimeController;
  final TextEditingController clientController;
  final TextEditingController durationController;
  final TextEditingController bufferController;
  final ValueChanged<String> onDateChanged;
  final ValueChanged<String> onStartTimeChanged;
  final ValueChanged<String> onClientChanged;
  final ValueChanged<String> onDurationChanged;
  final ValueChanged<String> onBufferChanged;

  const _ScheduleSection({
    required this.dateController,
    required this.startTimeController,
    required this.clientController,
    required this.durationController,
    required this.bufferController,
    required this.onDateChanged,
    required this.onStartTimeChanged,
    required this.onClientChanged,
    required this.onDurationChanged,
    required this.onBufferChanged,
  });

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Schedule',
      child: Column(
        children: [
          TextField(
            key: const ValueKey('tour-date-input'),
            controller: dateController,
            decoration: const InputDecoration(
              labelText: 'Date',
              hintText: 'YYYY-MM-DD',
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.next,
            onChanged: onDateChanged,
          ),
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('tour-start-time-input'),
            controller: startTimeController,
            decoration: const InputDecoration(
              labelText: 'Start time',
              hintText: '09:00',
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.next,
            onChanged: onStartTimeChanged,
          ),
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('tour-client-input'),
            controller: clientController,
            decoration: const InputDecoration(
              labelText: 'Client name',
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.next,
            onChanged: onClientChanged,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  key: const ValueKey('tour-duration-input'),
                  controller: durationController,
                  decoration: const InputDecoration(
                    labelText: 'Stop minutes',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: onDurationChanged,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  key: const ValueKey('tour-buffer-input'),
                  controller: bufferController,
                  decoration: const InputDecoration(
                    labelText: 'Buffer minutes',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: onBufferChanged,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StopsSection extends StatelessWidget {
  final List<TourDraftStop> stops;
  final ValueChanged<int> onRemove;
  final ValueChanged<int> onMoveUp;
  final ValueChanged<int> onMoveDown;

  const _StopsSection({
    required this.stops,
    required this.onRemove,
    required this.onMoveUp,
    required this.onMoveDown,
  });

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Stops',
      child: stops.isEmpty
          ? const _EmptyDraft()
          : Column(
              children: [
                for (var index = 0; index < stops.length; index++) ...[
                  _StopTile(
                    key: ValueKey('tour-stop-${stops[index].listingId}'),
                    stop: stops[index],
                    index: index,
                    isFirst: index == 0,
                    isLast: index == stops.length - 1,
                    onRemove: () => onRemove(index),
                    onMoveUp: () => onMoveUp(index),
                    onMoveDown: () => onMoveDown(index),
                  ),
                  if (index != stops.length - 1) const SizedBox(height: 8),
                ],
              ],
            ),
    );
  }
}

class _EmptyDraft extends StatelessWidget {
  const _EmptyDraft();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Padding(
        padding: EdgeInsets.all(16),
        child:
            Text('No stops yet. Add listings from Search or Listing Detail.'),
      ),
    );
  }
}

class _StopTile extends StatelessWidget {
  final TourDraftStop stop;
  final int index;
  final bool isFirst;
  final bool isLast;
  final VoidCallback onRemove;
  final VoidCallback onMoveUp;
  final VoidCallback onMoveDown;

  const _StopTile({
    super.key,
    required this.stop,
    required this.index,
    required this.isFirst,
    required this.isLast,
    required this.onRemove,
    required this.onMoveUp,
    required this.onMoveDown,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 16,
              child: Text('${index + 1}'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stop.address,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    stop.listingId,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  key: ValueKey('move-up-${stop.listingId}'),
                  tooltip: 'Move up',
                  onPressed: isFirst ? null : onMoveUp,
                  icon: const Icon(Icons.keyboard_arrow_up),
                ),
                IconButton(
                  key: ValueKey('move-down-${stop.listingId}'),
                  tooltip: 'Move down',
                  onPressed: isLast ? null : onMoveDown,
                  icon: const Icon(Icons.keyboard_arrow_down),
                ),
              ],
            ),
            IconButton(
              key: ValueKey('remove-stop-${stop.listingId}'),
              tooltip: 'Remove stop',
              onPressed: onRemove,
              icon: const Icon(Icons.close),
            ),
          ],
        ),
      ),
    );
  }
}

class _PersistActions extends StatelessWidget {
  final TourDraftState state;
  final bool isAuthenticated;
  final VoidCallback onSave;

  const _PersistActions({
    required this.state,
    required this.isAuthenticated,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final canAttemptSave = state.canPersist && !state.isPersisting;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          key: const ValueKey('save-tour-draft'),
          onPressed: canAttemptSave ? onSave : null,
          icon: state.isPersisting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.cloud_upload_outlined),
          label: Text(state.isPersisting ? 'Saving...' : 'Save tour'),
        ),
        if (!state.canPersist) ...[
          const SizedBox(height: 8),
          const Text('Add at least one stop and a date before saving.'),
        ] else if (!isAuthenticated) ...[
          const SizedBox(height: 8),
          const Text('Sign in when you are ready to save this tour.'),
        ],
      ],
    );
  }
}

class _SavedTourCard extends StatelessWidget {
  final Tour tour;
  final bool isDeleting;
  final bool canDelete;
  final VoidCallback onDelete;

  const _SavedTourCard({
    required this.tour,
    required this.isDeleting,
    required this.canDelete,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.check_circle_outline,
                color: colorScheme.onPrimaryContainer),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Saved tour',
                    style: TextStyle(
                      color: colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    '${tour.title} • ${tour.stops.length} ${tour.stops.length == 1 ? 'stop' : 'stops'}',
                    style: TextStyle(color: colorScheme.onPrimaryContainer),
                  ),
                ],
              ),
            ),
            TextButton(
              key: const ValueKey('delete-current-tour'),
              onPressed: canDelete && !isDeleting ? onDelete : null,
              child: Text(isDeleting ? 'Deleting...' : 'Delete'),
            ),
          ],
        ),
      ),
    );
  }
}

enum _TourMessageTone { info, error }

class _TourMessage extends StatelessWidget {
  final String message;
  final _TourMessageTone tone;

  const _TourMessage({
    super.key,
    required this.message,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isError = tone == _TourMessageTone.error;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: isError
            ? colorScheme.errorContainer
            : colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          message,
          style: TextStyle(
            color:
                isError ? colorScheme.onErrorContainer : colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

int _totalTourMinutes(TourDraftState state) {
  if (state.stops.isEmpty) return 0;
  final stopMinutes = state.stops.length * state.defaultDurationMinutes;
  final gapCount = state.stops.length > 1 ? state.stops.length - 1 : 0;
  final bufferMinutes = gapCount * state.defaultBufferMinutes;
  return stopMinutes + bufferMinutes;
}

String? _addMinutesToTime(String value, int minutes) {
  final parts = value.split(':');
  if (parts.length != 2) return null;

  final hours = int.tryParse(parts[0]);
  final mins = int.tryParse(parts[1]);
  if (hours == null ||
      mins == null ||
      hours < 0 ||
      hours > 23 ||
      mins < 0 ||
      mins > 59) {
    return null;
  }

  final total = (hours * 60 + mins + minutes) % (24 * 60);
  final nextHours = total ~/ 60;
  final nextMinutes = total % 60;
  return '${nextHours.toString().padLeft(2, '0')}:${nextMinutes.toString().padLeft(2, '0')}';
}
