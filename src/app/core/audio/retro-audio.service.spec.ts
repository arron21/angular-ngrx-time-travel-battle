import { TestBed } from '@angular/core/testing';
import { RetroAudioService } from './retro-audio.service';

describe('RetroAudioService', () => {
  let service: RetroAudioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RetroAudioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should toggle mute state', () => {
    expect(service.muted).toBe(false);
    service.toggleMute();
    expect(service.muted).toBe(true);
    service.toggleMute();
    expect(service.muted).toBe(false);
  });

  it('should not throw errors when sound playback methods are invoked while muted', () => {
    service.toggleMute(); // mute
    expect(() => {
      service.playCursor();
      service.playSelect();
      service.playCancel();
      service.playBash();
      service.playSmash();
      service.playPsi();
      service.playHeal();
      service.playTimeRewind();
      service.playVictory();
    }).not.toThrow();
  });
});
